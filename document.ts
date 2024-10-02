import { ActorState } from "@deco/actors";
import { WatchTarget } from "@deco/actors/watch";
import { default as fjp } from "fast-json-patch";

export interface IDocument<TDocument> {
    patch: (
        ops: fjp.Operation[],
    ) => Promise<{ conflict: boolean; state: DocumentState<TDocument> }>;
    get: () => DocumentState<TDocument> | null;
    watch: () => AsyncIterableIterator<DocumentState<TDocument>>;
}

export interface DocumentState<T> {
    doc: T | null;
    version: number;
}
export class Document<T> implements IDocument<T> {
    private _state: DocumentState<T> | null;
    private watchTarget = new WatchTarget<DocumentState<T>>();

    constructor(protected state: ActorState) {
        this._state = null;
        state.blockConcurrencyWhile(async () => {
            this._state = await state.storage.get("state");
            this._state ??= { doc: null, version: 0 } as DocumentState<T>;
        });
    }
    async patch(
        ops: fjp.Operation[],
    ): Promise<{ conflict: boolean; state: DocumentState<T> }> {
        const initialState = this._state ??
            { doc: null, version: 0 } as { doc: T; version: number };
        try {
            const doc = ops.reduce<T>(
                fjp.applyReducer,
                initialState.doc ?? {} as T,
            );
            const nextState = {
                doc,
                version: initialState.version + 1,
            };
            const result = {
                conflict: false as const,
                state: nextState,
            };
            await this.state.storage.put("state", nextState);
            this._state = result.state;
            this.watchTarget.notify(this._state);
            return result;
        } catch (error) {
            if (
                error instanceof fjp.JsonPatchError &&
                error.name === "TEST_OPERATION_FAILED"
            ) {
                return {
                    conflict: true as const,
                    state: initialState,
                };
            }
            throw error;
        }
    }

    async reset(): Promise<void> {
        await this.state.storage.delete(["state"]);
        this._state ??= { doc: null, version: 0 } as DocumentState<T>;
    }
    get(): DocumentState<T> | null {
        return this._state;
    }
    watch(): AsyncIterableIterator<DocumentState<T>> {
        return this.watchTarget.subscribe();
    }
}
