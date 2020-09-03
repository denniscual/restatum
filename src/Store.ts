type Callback = () => void

interface IStore<S> {
    getState(): S
    dispatch(nextState: S): void
    subscribe(cb: Callback): Callback
    destroySubscribers: Callback
    setInitialStateFromRoot(nextState: S): void
}

export default class Store<S> implements IStore<S> {
    private _initialState: S
    private _currentState: S
    private _subscribers: Set<Callback> = new Set()

    public constructor(initialState: S) {
        this._initialState = initialState
        this._currentState = initialState
    }

    public getState = () => {
        return this._currentState
    }

    public dispatch = (nextState: S) => {
        this._currentState = nextState
        this._subscribers.forEach((cb) => cb())
    }

    public subscribe = (cb: Callback) => {
        this._subscribers.add(cb)
        const cancel = () => {
            this._subscribers.delete(cb)
        }
        return cancel
    }

    public destroySubscribers = () => {
        this._subscribers.clear()
    }

    public resetState = () => {
        this._currentState = this._initialState
    }

    public setInitialStateFromRoot = (nextState: S) => {
        this._currentState = nextState
    }
}
