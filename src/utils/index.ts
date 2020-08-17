import { isValidElementType } from 'react-is'
import { InitialState } from './types'

function isInitialStateAFunction<S>(
    initialState: InitialState<S>
): initialState is () => S {
    return typeof initialState === 'function'
}

function isContextType<T>(Context: React.Context<T>) {
    return (
        typeof Context === 'object' &&
        isValidElementType(Context.Provider) &&
        isValidElementType(Context.Consumer)
    )
}

function entries<T extends object, K extends keyof T>(object: T) {
    return Object.entries(object) as [K, T[K]][]
}

export { isInitialStateAFunction, isContextType, entries }
