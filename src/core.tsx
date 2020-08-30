import React from 'react'
import invariant from 'invariant'
import Store from './Store'
import { useSubscription } from './use-subscription'

// ------------------------------------------------------------------//
// ---------------------------- types ------------------------------//
// -----------------------------------------------------------------//

type Reducer = {
    (state: any, action: any): any
}

type InitialState<S> = S | (() => S)

type InitActionType<S, R> = R extends (state: any, action: infer A) => void
    ? A
    : React.SetStateAction<S>

type StoreConfiguration<T = any> = {
    [key in keyof T]: {
        initialState: any
        reducer?: Reducer
    }
}

type InitialStoreState<T extends StoreConfiguration> = {
    [Key in keyof T]: T[Key]['initialState']
}

type StoreStateAccessors<
    T extends StoreConfiguration,
    State extends InitialStoreState<T>
> = {
    [StoreConfigurationKey in keyof T]: StoreStateAccessor<
        T,
        StoreConfigurationKey,
        State
    >
}

type GetState<
    T extends StoreConfiguration,
    StoreConfigurationKey extends keyof T
> = T[StoreConfigurationKey]['initialState']

type GetDispatch<
    T extends StoreConfiguration,
    StoreConfigurationKey extends keyof T
> = React.Dispatch<
    InitActionType<
        T[StoreConfigurationKey]['initialState'],
        T[StoreConfigurationKey]['reducer']
    >
>

// ------------------------------------------------------------------//
// ---------------------------- utils ------------------------------//
// -----------------------------------------------------------------//

function entries<T extends object, K extends keyof T>(object: T) {
    return Object.entries(object) as [K, T[K]][]
}

class StoreStateAccessor<
    T extends StoreConfiguration,
    StoreConfigurationKey extends keyof T,
    State extends InitialStoreState<T>
> {
    private _key: StoreConfigurationKey
    private _config: T[StoreConfigurationKey]
    public Context: React.Context<Store<State>>

    public constructor(
        Context: React.Context<Store<State>>,
        key: StoreConfigurationKey,
        config: T[StoreConfigurationKey]
    ) {
        this.Context = Context
        this._key = key
        this._config = config
    }

    public getKey = () => {
        return this._key
    }

    public getDispatch = (store: Store<State>) => {
        const { getState, dispatch } = store
        // Use the `reducer` function passed in configuration.
        if (this._config.reducer) {
            const { reducer } = this._config
            const ownDispatch = (value: any) => {
                const nextState = reducer(getState()[this._key], value)
                dispatch({
                    ...getState(),
                    [this._key]: nextState,
                })
            }
            return ownDispatch
        } else {
            const ownDispatch = (value: any) => {
                let nextState
                if (typeof value === 'function') {
                    nextState = value(getState()[this._key])
                } else {
                    nextState = value
                }
                dispatch({
                    ...getState(),
                    [this._key]: nextState,
                })
            }
            return ownDispatch
        }
    }
}

function isSelectedValueEqual<SelectedValue>(
    prevValue: SelectedValue,
    nextValue: SelectedValue
) {
    return prevValue === nextValue
}

function identity<S>(state: S) {
    return state
}

// ------------------------------------------------------------------//
// ------------------------- createStore ---------------------------//
// -----------------------------------------------------------------//

/**
 * Creates a store container. A `Container` holds the store which is configured based on the configuration/arguments.
 * It returns `stateAccessors` and a `StoreProvider` that restricts the access of the stores.
 *
 * @example
 *
 * import { createStore } from 'restatum'
 *
 * // toggle is stateAccessor which is used to access a store state via hooks.
 * const { StoreProvider, toggle } = createStore({
 *   toggle: {
 *     initialState: false
 *   }
 * })
 * export default {
 *   StoreProvider,
 *   toggle
 * }
 */
function createStore<T extends StoreConfiguration>(configuration: T) {
    invariant(
        typeof configuration === 'object' && !Array.isArray(configuration),
        `Invalid configuration type. "createStore" is expecting object type but receives ${typeof configuration}.`
    )

    const initializeState = entries(configuration).reduce(
        (acc, [key, value]) => {
            acc[key] = value.initialState
            return acc
        },
        {} as {
            [Key in keyof T]: T[Key]['initialState']
        }
    )

    const store = new Store(initializeState)
    const StoreContext = React.createContext(store)

    let storeStateAccessors = entries(configuration).reduce(
        (acc, [key, config]) => {
            acc[key] = new StoreStateAccessor(StoreContext, key, config)
            return acc
        },
        {} as StoreStateAccessors<T, typeof initializeState>
    )

    function destroySubscribersAndReset() {
        store.destroySubscribers()
        store.resetState()
    }

    const StoreProvider: React.FC<{
        initializeState?: {
            [K in keyof T]?: InitialState<T[K]['initialState']>
        }
    }> = ({ initializeState, children }) => {
        const isInitialRender = React.useRef(true)

        // Only execute the initialization in initial render of the `StoreProvider`.
        if (isInitialRender.current && initializeState) {
            const initializeStateFromStoreProvider = () => {
                const _initializeState = entries({
                    // This spread will fill the missing keys from the `initializeState`.
                    ...store.getState(),
                    ...initializeState,
                }).reduce(
                    (acc, [key, value]) => {
                        if (typeof value === 'function') {
                            acc[key] = value(store.getState()[key])
                        } else {
                            acc[key] = value
                        }
                        return acc
                    },
                    {} as {
                        [Key in keyof T]: T[Key]['initialState']
                    }
                )

                store.setInitialStateFromRoot(_initializeState)
            }
            initializeStateFromStoreProvider()
        }
        isInitialRender.current = false

        React.useEffect(() => destroySubscribersAndReset, [])

        return (
            <StoreContext.Provider value={store}>
                {children}
            </StoreContext.Provider>
        )
    }

    return {
        StoreProvider,
        ...storeStateAccessors,
    }
}

// ------------------------------------------------------------------//
// ---------------------------- hooks ------------------------------//
// -----------------------------------------------------------------//

/**
 * A hook to access the store state value. Component which uses the hook is automatically bound to the state.
 * Means, the Component will rerender whenever there is stata change.
 * It returns state value.
 *
 * This hook also accepts an optional `selector` and `isEqual`. Use this
 * if your state value structure is complex.
 *
 * @example
 *
 * import { useValue } from 'restatum'
 * import appContainer from './appContainer'
 *
 * export const ToggleComponent = () => {
 *   const toggle = useValue(appContainer.toggle)
 *   return <div>Toggle is { toggle ? 'on' : 'off' }</div>
 * }
 */
function useValue<
    T extends StoreConfiguration,
    StoreConfigurationKey extends keyof T,
    State extends InitialStoreState<T>,
    // initiase this type so that the return type of the `useValue` is equal
    // to the state type if no provided selector
    SelectedValue = GetState<T, StoreConfigurationKey>
>(
    storeStateAccessor: StoreStateAccessor<T, StoreConfigurationKey, State>,
    selector: (
        state: GetState<T, StoreConfigurationKey>
    ) => SelectedValue = identity,
    isEqual: (
        prevValue: SelectedValue,
        nextValue: SelectedValue
    ) => boolean = isSelectedValueEqual
): SelectedValue {
    invariant(
        storeStateAccessor instanceof StoreStateAccessor,
        `Invalid storeStateAccessor instance type. "useValue" is expecting a StoreStateAccessor instance. `
    )
    invariant(
        typeof selector === 'function',
        `Invalid selector type. "useValue" is expecting function type but receives ${typeof selector}.`
    )
    invariant(
        typeof isEqual === 'function',
        `Invalid isEqual type. "useValue" is expecting function type but receives ${typeof isEqual}.`
    )

    const { Context, getKey } = storeStateAccessor
    const store = React.useContext(Context)

    const latestSelector = React.useRef(selector)

    if (latestSelector.current !== selector) {
        latestSelector.current = selector
    }

    const subscription = React.useMemo(() => {
        return {
            getCurrentValue: () => {
                try {
                    const value = latestSelector.current(
                        store.getState()[getKey()]
                    )
                    return value
                } catch (err) {
                    const newErr = new Error(
                        `There was an error when trying to invoke the provided "selector".`
                    )
                    newErr.stack = err.stack
                    throw newErr
                }
            },
            subscribe: (callback: any) => {
                return store.subscribe(callback)
            },
        }
    }, [store, getKey])

    const value = useSubscription(subscription, isEqual)

    // Display the current value for this hook in React DevTools.
    React.useDebugValue(`Selected value: ${value}`)

    return value
}

/**
 * A hook to access the store state dispatch. Component which uses the hook is not bound to the state.
 * Whenever there is a state change, the Component uses the hook will not rerender.
 *
 * @example
 *
 * import { useDispatch } from 'restatum'
 * import appContainer from './appContainer'
 *
 * export const ToggleComponent = () => {
 *   const setToggle = useDispatch(appContainer.toggle)
 *   return (
 *     <button onClick={() => setToggle(p => !p)}></button>
 *   )
 * }
 */
function useDispatch<
    T extends StoreConfiguration,
    StoreConfigurationKey extends keyof T,
    State extends InitialStoreState<T>
>(
    storeStateAccessor: StoreStateAccessor<T, StoreConfigurationKey, State>
): GetDispatch<T, StoreConfigurationKey> {
    invariant(
        storeStateAccessor instanceof StoreStateAccessor,
        `Invalid storeStateAccessor instance type. "useValue" is expecting a StoreStateAccessor instance. `
    )
    const { Context, getDispatch } = storeStateAccessor
    const store = React.useContext(Context)

    return getDispatch(store)
}

/**
 * A hook to access the store state value and its associated dispatch. Component which uses the hook is automatically bound to the state.
 * It returns a tuple type for state and dispatch.
 *
 * @example
 *
 * import { useStoreState } from 'restatum'
 * import appContainer from './appContainer'
 *
 * export const ToggleComponent = () => {
 *   const [toggle, setToggle] = useStoreState(appContainer.toggle)
 *   return (
 *     <div>
 *       <span>Toggle is { toggle ? 'on' : 'off' }</span>
 *       <button onClick={() => setToggle(p => !p)}></button>
 *     </div>
 *   )
 * }
 */
function useStoreState<
    T extends StoreConfiguration,
    StoreConfigurationKey extends keyof T,
    State extends InitialStoreState<T>
>(
    storeStateAccessor: StoreStateAccessor<T, StoreConfigurationKey, State>
): [GetState<T, StoreConfigurationKey>, GetDispatch<T, StoreConfigurationKey>] {
    invariant(
        storeStateAccessor instanceof StoreStateAccessor,
        `Invalid storeStateAccessor instance type. "useValue" is expecting a StoreStateAccessor instance. `
    )
    const value = useValue(storeStateAccessor)
    const dispatch = useDispatch(storeStateAccessor)
    return [value, dispatch]
}

/**
 * A hook to access the store state value and its associated dispatch. Component which uses the hook is automatically bound to the state.
 * It returns a tuple type for state and dispatch.
 * Alias for `useStoreState`. In the future, `useStoreState` will be deprecated in favor for this hook.
 *
 * @example
 *
 * import { useSt8 } from 'restatum'
 * import appContainer from './appContainer'
 *
 * export const ToggleComponent = () => {
 *   const [toggle, setToggle] = useSt8(appContainer.toggle)
 *   return (
 *     <div>
 *       <span>Toggle is { toggle ? 'on' : 'off' }</span>
 *       <button onClick={() => setToggle(p => !p)}></button>
 *     </div>
 *   )
 * }
 */
function useSt8<
    T extends StoreConfiguration,
    StoreConfigurationKey extends keyof T,
    State extends InitialStoreState<T>
>(
    storeStateAccessor: StoreStateAccessor<T, StoreConfigurationKey, State>
): [GetState<T, StoreConfigurationKey>, GetDispatch<T, StoreConfigurationKey>] {
    invariant(
        storeStateAccessor instanceof StoreStateAccessor,
        `Invalid storeStateAccessor instance type. "useValue" is expecting a StoreStateAccessor instance. `
    )
    const value = useValue(storeStateAccessor)
    const dispatch = useDispatch(storeStateAccessor)
    return [value, dispatch]
}

/**
 * A hook to subscribe to a store state. Whenever there is a state change, the passed
 * callback will execute but the Component will not rerender. It receives the latest state.
 *
 * @example
 *
 * import { useSubscribe } from 'restatum'
 * import appContainer from './appContainer'
 *
 * export const ToggleComponent = () => {
 *   useSubscribe(appContainer.toggle, state => console.log(state))
 *   return (
 *     <div>Hey! This is a Toggle Component</div>
 *   )
 * }
 */
function useSubscribe<
    T extends StoreConfiguration,
    StoreConfigurationKey extends keyof T,
    State extends InitialStoreState<T>
>(
    storeStateAccessor: StoreStateAccessor<T, StoreConfigurationKey, State>,
    subscriber: (state: GetState<T, StoreConfigurationKey>) => void
) {
    invariant(
        storeStateAccessor instanceof StoreStateAccessor,
        `Invalid storeStateAccessor instance type. "useValue" is expecting a StoreStateAccessor instance. `
    )
    const { Context, getKey } = storeStateAccessor
    const store = React.useContext(Context)

    React.useEffect(() => {
        store.subscribe(() => {
            const value = store.getState()[getKey()]
            subscriber(value)
        })
    }, [getKey, store, subscriber])
}

export {
    createStore,
    useSt8,
    useStoreState,
    useDispatch,
    useValue,
    useSubscribe,
}
