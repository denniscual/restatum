import { InitialState } from './types'

function isInitialStateAFunction<S>(
    initialState: InitialState<S>
): initialState is () => S {
    return typeof initialState === 'function'
}

function entries<T extends object, K extends keyof T>(object: T) {
    return Object.entries(object) as [K, T[K]][]
}

export { isInitialStateAFunction, entries }
