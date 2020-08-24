import { isInitialStateAFunction } from './utils'
import { Callback, InitialState } from './utils/types'

interface IRootStore<S> {
    getState(): S
    rootDispatch(nextState: S): void
    subscribe(cb: Callback): Callback
    setInitialStateFromRoot(init: InitialState<S>): void
    destroySubscribers: Callback
}

export default class RootStore<S> implements IRootStore<S> {
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

    // We will create setState and dispatch on top of this.
    public rootDispatch = (nextState: S) => {
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

    /* // This function will only be called once - in initial render of the Component. */
    /* // This mimic the behaviuor of React.useState let say for lazily initialisation. */
    public setInitialStateFromRoot = (init: InitialState<S>) => {
        if (isInitialStateAFunction(init)) {
            this.currentState = init()
        } else {
            this.currentState = init
        }
    }

    public destroySubscribers = () => {
        this.subscribers.clear()
    }

    public resetState = () => {
        this.currentState = this.initialState
    }
}
