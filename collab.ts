import { ActorState } from "@deco/actors";
import { WatchTarget } from "@deco/actors/watch";
import { default as fjp } from "fast-json-patch";

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

interface IExcalidrawCollab {
    join: (
        collab: Collaborator,
    ) => AsyncIterableIterator<CollabEvent>;
    update: (collab: Collaborator) => void;
    patch(
        ops: Record<string, ExcalidrawElement | { deleted: true }>,
    ): Promise<VersionedScene & { conflict?: true }>;
    patch(ops: fjp.Operation[]): Promise<VersionedScene & { conflict?: true }>;
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

export interface VersionedScene extends SceneSyncData {
    version: number;
}

export type CollabEvent =
    | SceneDataEvent
    | CollaboratorUpdateEvent
    | CollaboratorLeftEvent
    | SceneElementsSyncedDataEvent;

export class ExcalidrawCollab implements IExcalidrawCollab {
    private _collaborators: Record<string, Collaborator> = {};
    private collabEvents = new WatchTarget<CollabEvent>();
    private sceneData: SceneSyncData = {
        elements: {},
    };
    private sceneVersion = 0;

    constructor(protected state: ActorState) {
        state.blockConcurrencyWhile(async () => {
            const { version, elements } = await state.storage.get<
                VersionedScene
            >("state") ?? { version: 0, elements: {} };
            this.sceneVersion = version;
            this.sceneData = { elements };
        });
    }

    update(collab: Collaborator): void {
        this._collaborators[collab.id!] = collab;
        this.collabEvents.notify({
            type: "collaborator-updated",
            payload: collab,
        });
    }

    private async jsonPatch(
        ops: fjp.Operation[],
    ): Promise<VersionedScene & { conflict?: true }> {
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
            await this.state.storage.put("state", nextState);
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
    ): Promise<VersionedScene & { conflict?: true }>;
    patch(
        ops: fjp.Operation[],
    ): Promise<VersionedScene & { conflict?: true }>;
    async patch(
        patchOrPartials:
            | fjp.Operation[]
            | Record<string, ExcalidrawElement | { deleted: true }>,
    ): Promise<VersionedScene & { conflict?: true }> {
        if (Array.isArray(patchOrPartials)) {
            return this.jsonPatch(patchOrPartials);
        }
        for (
            const [elementId, element] of Object.entries(
                this.sceneData.elements,
            )
        ) {
            const partialElement = patchOrPartials[element.id];

            // If the partial element exists and should be deleted
            if (partialElement && "deleted" in partialElement) {
                // Instead of deleting, you can mark it as deleted to avoid changing object shape
                delete this.sceneData.elements[elementId];
                delete patchOrPartials[element.id]; // Remove the processed element from patchOrPartials
                continue;
            }

            // If the partial element exists and is more up-to-date, update the element
            if (partialElement && partialElement.updated > element.updated) {
                this.sceneData.elements[elementId] = partialElement;
                delete patchOrPartials[element.id]; // Remove the processed element from patchOrPartials
                continue;
            }
        }

        // Process any remaining new elements that were not updated in the first loop
        for (const value of Object.values(patchOrPartials)) {
            if (value && "deleted" in value) {
                continue; // Skip deleted elements
            }

            // Add new elements
            this.sceneData.elements[value.id] = value;
        }

        const nextState = {
            version: ++this.sceneVersion,
            elements: this.sceneData.elements,
        };
        await this.state.storage.put("state", nextState);
        this.collabEvents.notify({
            type: "scene-elements-synced",
            payload: nextState,
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
        this.update(collab);
        yield* subscribe;
    }
}
