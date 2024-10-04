import { ActorState } from "@deco/actors";
import { WatchTarget } from "@deco/actors/watch";
import { default as fjp } from "fast-json-patch";
import { throttle } from "./util.ts";

export interface ExcalidrawElement {
    id: string;
    updated: number;
}
export declare enum UserIdleState {
    ACTIVE = "active",
    AWAY = "away",
    IDLE = "idle",
}
export interface Collaborator {
    pointer?: CollaboratorPointer;
    button?: "up" | "down";
    selectedElementIds?: Record<string, boolean>;
    username?: string | null;
    userState?: UserIdleState;
    color?: {
        background: string;
        stroke: string;
    };
    avatarUrl?: string;
    id?: string;
}

export interface CollaboratorPointer {
    x: number;
    y: number;
    tool: "pointer" | "laser";
}

export type PatchResponse = VersionedScene & { conflict?: true };
export type ExcalidrawElementOrDeleted = ExcalidrawElement | { deleted: true };
export interface IExcalidrawCollab {
    join: (
        collab: Collaborator,
    ) => AsyncIterableIterator<CollabEvent>;
    update: (collab: Collaborator) => void;
    patch(
        ops: Record<string, ExcalidrawElementOrDeleted>,
    ): PatchResponse;
    patch(ops: fjp.Operation[]): PatchResponse;
}

export interface SceneSyncData {
    elements: Record<string, ExcalidrawElement>;
}

export interface SceneData extends SceneSyncData {
    collaborators: Record<string, Collaborator>;
}

export interface BaseEvent<T> {
    type: string;
    payload: T;
}

export interface CollaboratorUpdateEvent extends BaseEvent<Collaborator> {
    type: "collaborator-updated";
}
export interface CollaboratorLeftEvent extends BaseEvent<string> {
    type: "collaborator-left";
}
export interface SceneDataEvent
    extends BaseEvent<SceneData & { version: number }> {
    type: "scene-synced";
}

export interface SceneElementsSyncedDataEvent
    extends BaseEvent<VersionedScene> {
    type: "scene-elements-synced";
}

export interface SceneElementsDiffDataEvent
    extends BaseEvent<VersionedElementsDiff> {
    type: "scene-elements-diff";
}

export interface VersionedScene extends SceneSyncData {
    version: number;
}

export interface VersionedElementsDiff {
    version: number;
    diff: Record<string, ExcalidrawElementOrDeleted>;
}

export type CollabEvent =
    | SceneDataEvent
    | CollaboratorUpdateEvent
    | CollaboratorLeftEvent
    | SceneElementsSyncedDataEvent
    | SceneElementsDiffDataEvent;

const SAVE_EVERY_10_SECONDS_MS = 1000 * 10;
export class ExcalidrawCollab implements IExcalidrawCollab {
    private _collaborators: Record<string, Collaborator> = {};
    private collabEvents = new WatchTarget<CollabEvent>();
    private sceneData: SceneSyncData = {
        elements: {},
    };
    private throttledSaveState: () => void;
    private sceneVersion = 0;

    constructor(protected state: ActorState) {
        this.throttledSaveState = throttle(async () => {
            await this.state.storage.put("state", {
                elements: this.sceneData.elements,
                version: this.sceneVersion,
            });
        }, SAVE_EVERY_10_SECONDS_MS);
        state.blockConcurrencyWhile(async () => {
            const { version, elements } = await state.storage.get<
                VersionedScene
            >("state") ?? { version: 0, elements: {} };
            this.sceneVersion = version;
            this.sceneData = { elements };
        });
    }

    private set(collab: Collaborator): void {
        this._collaborators[collab.id!] = collab;
        this.collabEvents.notify({
            type: "collaborator-updated",
            payload: collab,
        });
    }

    update(collab: Collaborator): void {
        if (collab.id && collab.id in this._collaborators) {
            this.set(collab);
        }
    }

    private jsonPatch(
        ops: fjp.Operation[],
    ): PatchResponse {
        try {
            const sceneData = ops.reduce(
                fjp.applyReducer,
                this.sceneData,
            );
            this.sceneVersion++;
            const nextState = {
                elements: sceneData.elements,
                version: this.sceneVersion,
            };
            this.sceneData = sceneData;
            this.throttledSaveState();
            this.collabEvents.notify({
                type: "scene-elements-synced",
                payload: nextState,
            });
            return nextState;
        } catch {
            return {
                ...this.sceneData,
                version: this.sceneVersion,
                conflict: true,
            };
        }
    }

    patch(
        ops: Record<string, ExcalidrawElement>,
    ): PatchResponse;
    patch(
        ops: fjp.Operation[],
    ): PatchResponse;
    patch(
        patchOrPartials:
            | fjp.Operation[]
            | Record<string, ExcalidrawElement | { deleted: true }>,
    ): PatchResponse {
        if (Array.isArray(patchOrPartials)) {
            return this.jsonPatch(patchOrPartials);
        }
        for (
            const [elementId, partialElement] of Object.entries(
                patchOrPartials,
            )
        ) {
            // If the partial element exists and should be deleted
            if ("deleted" in partialElement) {
                // Instead of deleting, you can mark it as deleted to avoid changing object shape
                delete this.sceneData.elements[elementId];
                continue;
            }
            const element = this.sceneData.elements[elementId];

            // If the partial element exists and is more up-to-date, update the element
            if (
                !element ||
                partialElement.updated > element.updated
            ) {
                this.sceneData.elements[elementId] = partialElement;
                continue;
            }
            delete patchOrPartials[elementId];
        }

        const nextState = {
            version: ++this.sceneVersion,
            elements: this.sceneData.elements,
        };

        this.throttledSaveState();
        this.collabEvents.notify({
            type: "scene-elements-diff",
            payload: { diff: patchOrPartials, version: nextState.version },
        });
        return nextState;
    }

    async *join(
        collab: Collaborator,
    ): AsyncIterableIterator<CollabEvent> {
        collab.id ??= crypto.randomUUID();
        const leave = () => {
            delete this._collaborators[collab.id!];
            this.collabEvents.notify({
                type: "collaborator-left",
                payload: collab.id!,
            });
        };

        const subscribe = this.collabEvents.subscribe();

        this.set(collab);

        const retn = subscribe.return;
        subscribe.return = function (val) {
            leave();
            return retn?.call(subscribe, val) ?? val;
        };

        yield {
            type: "scene-synced",
            payload: {
                elements: this.sceneData.elements,
                collaborators: this._collaborators,
                version: this.sceneVersion,
            },
        };
        for await (const event of subscribe) {
            if (
                // skip self updates
                event.type === "collaborator-updated" &&
                event.payload.id === collab.id
            ) {
                continue;
            }
            yield event;
        }
    }
}
