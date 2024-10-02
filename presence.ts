import { ActorState } from "@deco/actors";
import { WatchTarget } from "@deco/actors/watch";

interface User {
    id: string;
    name: string;
    country: string;
    x: number;
    y: number;
}

type UserId = string;

interface State {
    users: Record<UserId, User>;
}

interface IPresence {
    join: (userId: string) => AsyncIterableIterator<State>;
    update: (userId: string, ctx: { x: number; y: number }) => void;
}

export class Presence implements IPresence {
    private _state: State = {
        users: {},
    };
    private watchTarget = new WatchTarget<State>();

    constructor(protected state: ActorState) {
        state.blockConcurrencyWhile(async () => {});
    }

    update(userId: string, ctx: { x: number; y: number }): void {
        this._state.users[userId].x = ctx.x;
        this._state.users[userId].y = ctx.y;

        this.watchTarget.notify(this._state);
    }

    join(userId: string): AsyncIterableIterator<State> {
        this._state.users[userId] ??= {
            id: userId,
            name: "Anonymous",
            country: "Unknown",
            x: 0,
            y: 0,
        };
        const leave = () => {
            delete this._state.users[userId];
            this.watchTarget.notify(this._state);
        };

        const subscribe = this.watchTarget.subscribe();
        this.watchTarget.notify(this._state);
        const retn = subscribe.return;
        subscribe.return = function (val) {
            leave();
            return retn?.call(subscribe, val) ?? val;
        };

        return subscribe;
    }
}
