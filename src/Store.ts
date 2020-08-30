type Callback = () => void

interface IStore<S> {
    getState(): S
    dispatch(nextState: S): void
    subscribe(cb: Callback): Callback
    destroySubscribers: Callback
    setInitialStateFromRoot(nextState: S): void
}

export default class Store<S> implements IStore<S> {
    private initialState: S
    private currentState: S
    private subscribers: Set<Callback> = new Set()

    public constructor(initialState: S) {
        this.initialState = initialState
        this.currentState = initialState
    }

    public getState = () => {
        return this.currentState
    }

    public dispatch = (nextState: S) => {
        this.currentState = nextState
        this.subscribers.forEach((cb) => cb())
    }

    public subscribe = (cb: Callback) => {
        this.subscribers.add(cb)
        const cancel = () => {
            this.subscribers.delete(cb)
        }
        return cancel
    }

    public destroySubscribers = () => {
        this.subscribers.clear()
    }

    public resetState = () => {
        this.currentState = this.initialState
    }

    public setInitialStateFromRoot = (nextState: S) => {
        this.currentState = nextState
    }
}
