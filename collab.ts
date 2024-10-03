import { ActorState } from "@deco/actors";
import { WatchTarget } from "@deco/actors/watch";
import { default as fjp } from "fast-json-patch";

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
    patch(ops: fjp.Operation[]): Promise<VersionedScene>;
}

export interface SceneSyncData {
    elements: unknown[];
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

export interface SceneElementsScynedDataEvent
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
    | SceneElementsScynedDataEvent;

export class ExcalidrawCollab implements IExcalidrawCollab {
    private _collaborators: Record<string, Collaborator> = {};
    private collabEvents = new WatchTarget<CollabEvent>();
    private sceneData: SceneSyncData = {
        elements: [],
    };
    private sceneVersion = 0;

    constructor(protected state: ActorState) {
        state.blockConcurrencyWhile(async () => {
            const { version, elements } = await state.storage.get<
                VersionedScene
            >("state") ?? { version: 0, elements: [] };
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

    async patch(ops: fjp.Operation[]): Promise<VersionedScene> {
        try {
            const sceneData = ops.reduce(
                fjp.applyReducer,
                this.sceneData,
            );
            const nextState = {
                elements: sceneData.elements,
                version: this.sceneVersion + 1,
            };
            this.sceneData = sceneData;
            await this.state.storage.put("state", nextState);
            this.collabEvents.notify({
                type: "scene-elements-synced",
                payload: nextState,
            });
            return nextState;
        } catch {
            return { ...this.sceneData, version: this.sceneVersion };
        }
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
        this.update(collab);

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
        yield* subscribe;
    }
}
