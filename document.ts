import { ActorState } from "@deco/actors";
import { WatchTarget } from "@deco/actors/watch";
import { default as fjp } from "fast-json-patch";

export interface IDocument<TDocument> {
    patch: (
        ops: fjp.Operation[],
    ) => Promise<{ conflict: boolean; content: TDocument }>;
    get: () => TDocument | null;
    watch: () => AsyncIterableIterator<TDocument>;
}

export class Document<T> implements IDocument<T> {
    private _state: T | null;
    private watchTarget = new WatchTarget<T>();

    constructor(protected state: ActorState) {
        this._state = null;
        state.blockConcurrencyWhile(async () => {
            this._state = await state.storage.get("state");
        });
    }
    async patch(
        ops: fjp.Operation[],
    ): Promise<{ conflict: boolean; content: T }> {
        const initialState = this._state ?? {} as T;
        try {
            const result = {
                conflict: false as const,
                content: ops.reduce<T>(fjp.applyReducer, initialState),
            };
            await this.state.storage.put("state", result.content);
            this._state = result.content;
            this.watchTarget.notify(result.content);
            return result;
        } catch (error) {
            if (
                error instanceof fjp.JsonPatchError &&
                error.name === "TEST_OPERATION_FAILED"
            ) {
                return {
                    conflict: true as const,
                    content: initialState,
                };
            }
            throw error;
        }
    }
    get(): T | null {
        return this._state;
    }
    watch(): AsyncIterableIterator<T> {
        return this.watchTarget.subscribe();
    }
}
