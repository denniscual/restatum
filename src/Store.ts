import { isInitialStateAFunction } from './utils'
import { Callback, InitialState } from './utils/types'

export default class Store<S> {
    currentState: S
    subscribers: Set<Callback> = new Set()

    public constructor(initialState: S) {
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
        const cleanup = () => {
            this.subscribers.delete(cb)
        }
        return cleanup
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
}
