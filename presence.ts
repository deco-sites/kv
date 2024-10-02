import Haikunator from "@atrox/haikunator";
import { ActorState } from "@deco/actors";
import { WatchTarget } from "@deco/actors/watch";
// ES6: import Haikunator from 'haikunator'

// Instantiate Haikunator without options
const haikunator = new Haikunator();

interface Cursor {
    x: number;
    y: number;
}
interface User {
    id: string;
    name: string;
    cursor: Cursor;
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

    update(userId: string, cursor: Cursor): void {
        this._state.users[userId].cursor = cursor;
        this.watchTarget.notify(this._state);
    }

    join(userId: string): AsyncIterableIterator<State> {
        const name = haikunator.haikunate({ tokenLength: 0, delimiter: " " }); // => "delicate haze"

        this._state.users[userId] ??= {
            id: userId,
            name,
            cursor: { x: 0, y: 0 },
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
