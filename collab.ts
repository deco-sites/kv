import { ActorState } from "@deco/actors";
import { WatchTarget } from "@deco/actors/watch";
import { default as fjp } from "fast-json-patch";
import { interleave, throttle } from "./util.ts";

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
  joinCollab: (
    collab: Collaborator,
  ) => AsyncIterableIterator<CollaborationEvents | SceneDataEvent>;
  join: (
    collab: Collaborator,
  ) => AsyncIterableIterator<CollabEvent>;
  watch: () => AsyncIterableIterator<SceneEvents>;
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

export type CollaborationEvents =
  | CollaboratorUpdateEvent
  | CollaboratorLeftEvent;

export type SceneEvents =
  | SceneDataEvent
  | SceneElementsSyncedDataEvent
  | SceneElementsDiffDataEvent;

export type CollabEvent =
  | SceneEvents
  | CollaborationEvents;

const BATCH_SIZE = 100;
const SAVE_EVERY_10_SECONDS_MS = 1000 * 10;
export class ExcalidrawCollab implements IExcalidrawCollab {
  private _collaborators: Record<string, Collaborator> = {};
  private collaborationEvents = new WatchTarget<CollaborationEvents>();
  private sceneEvents = new WatchTarget<SceneEvents>();

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
    this.collaborationEvents.notify({
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
      this.sceneEvents.notify({
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
      | Record<string, ExcalidrawElementOrDeleted>,
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
    this.sceneEvents.notify({
      type: "scene-elements-diff",
      payload: { diff: patchOrPartials, version: nextState.version },
    });
    return nextState;
  }

  async *watch(): AsyncIterableIterator<SceneEvents> {
    const subscription = this.sceneEvents.subscribe();
    const keys = Object.keys(this.sceneData.elements);
    const version = this.sceneVersion;
    if (keys.length === 0) {
      yield {
        type: "scene-elements-diff",
        payload: {
          diff: {},
          version,
        },
      };
    }
    for (let slice = 0; slice < keys.length; slice = slice + BATCH_SIZE) {
      const elements: Record<string, ExcalidrawElement> = {};
      for (const key of keys.slice(slice, slice + BATCH_SIZE)) {
        elements[key] = this.sceneData.elements[key];
      }
      yield {
        type: "scene-elements-diff",
        payload: {
          diff: elements,
          version,
        },
      };
    }
    yield* subscription;
  }

  async *joinCollab(
    collab: Collaborator,
  ): AsyncIterableIterator<CollaborationEvents | SceneDataEvent> { // compat only
    collab.id ??= crypto.randomUUID();
    const leave = () => {
      delete this._collaborators[collab.id!];
      this.collaborationEvents.notify({
        type: "collaborator-left",
        payload: collab.id!,
      });
    };

    const subscribe = this.collaborationEvents.subscribe();

    this.set(collab);

    const retn = subscribe.return;
    subscribe.return = function (val) {
      leave();
      return retn?.call(subscribe, val) ?? val;
    };

    yield {
      type: "scene-synced",
      payload: {
        elements: {},
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

  async *join(
    collab: Collaborator,
  ): AsyncIterableIterator<CollabEvent> {
    collab.id ??= crypto.randomUUID();
    const leave = () => {
      delete this._collaborators[collab.id!];
      this.collaborationEvents.notify({
        type: "collaborator-left",
        payload: collab.id!,
      });
    };

    const collabSubscribe = this.collaborationEvents.subscribe();
    const sceneSubscribe = this.sceneEvents.subscribe();

    this.set(collab);

    const retn = collabSubscribe.return;
    collabSubscribe.return = function (val) {
      leave();
      return retn?.call(collabSubscribe, val) ?? val;
    };

    yield {
      type: "scene-synced",
      payload: {
        elements: this.sceneData.elements,
        collaborators: this._collaborators,
        version: this.sceneVersion,
      },
    };
    const interleaved = interleave(collabSubscribe, sceneSubscribe);
    for await (const event of interleaved) {
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
