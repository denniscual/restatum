import React from 'react'
import invariant from 'invariant'
import { useSubscription } from 'use-subscription'
import { entries } from './utils'
import RootStore from './Store'
import { Callback, InitialState } from './utils/types'

type Reducer = {
    (state: any, action: any): any
}

type InitActionType<S, R> = R extends (state: any, action: infer A) => void
    ? A
    : React.SetStateAction<S>

type StoresConfiguration<T = any> = {
    [key in keyof T]: {
        initialState: any
        reducer?: Reducer
    }
}

interface Store<S, R> extends Omit<RootStore<S>, 'rootDispatch'> {
    dispatch: React.Dispatch<InitActionType<S, R>>
}

type Stores<T extends StoresConfiguration> = {
    [K in keyof T]: Store<T[K]['initialState'], T[K]['reducer']>
}

type StoreAccessor<B, K> = { Context: React.Context<B | null>; getKey: () => K }

type StoreAccessors<T extends StoresConfiguration, B extends Stores<T>> = {
    [K in keyof T]: StoreAccessor<B, K>
}

// ------------------------------------------------------------------//
// ----------------------- createContainer --------------------------//
// -----------------------------------------------------------------//

/**
 * Creates a stores container. A `Container` holds the stores provided on the configuration/arguments.
 * It returns `storeAccessors` and a `StoresProvider` that restricts the access of the stores.
 *
 * @example
 *
 * import { createContainer } from 'restatum'
 *
 * // toggle is storeAccessor which is used to access a store via hooks.
 * const { StoresProvider, toggle } = createContainer({
 *   toggle: {
 *     initialState: false
 *   }
 * })
 * export default {
 *   StoresProvider,
 *   toggle
 * }
 */
function createContainer<T extends StoresConfiguration>(configuration: T) {
    invariant(
        typeof configuration === 'object' && !Array.isArray(configuration),
        `Invalid configuration type. "createContainer" is expecting type object but receives ${typeof configuration}.`
    )

    const stores: Stores<T> = {} as any
    // This holds the Context and the key to get the correct store.
    const storeAccessors: StoreAccessors<T, typeof stores> = {} as any
    const StoresContext = React.createContext<typeof stores | null>(null)

    function addStoreAccessor(key: keyof T) {
        return {
            Context: StoresContext,
            getKey() {
                return key
            },
        }
    }

    // Adding stores.
    entries(configuration).forEach(([key, value]) => {
        // we use this value to access the Context inside the Component.
        storeAccessors[key] = addStoreAccessor(key)

        const store = new RootStore(value.initialState)
        function addStore() {
            return {
                destroySubscribers: store.destroySubscribers,
                subscribe: store.subscribe,
                getState: store.getState,
                setInitialStateFromRoot: store.setInitialStateFromRoot,
                resetState: store.resetState,
            }
        }

        // We need to distinguish the state which uses the reducer or the simple setter.
        // to be able we can create the appropriate `dispatch` for the given state.
        if (value.reducer) {
            const { reducer } = value
            stores[key] = {
                ...addStore(),
                dispatch(action: any) {
                    const nextState = reducer(store.getState(), action)
                    store.rootDispatch(nextState)
                },
            }
        } else {
            stores[key] = {
                ...addStore(),
                dispatch(value: any) {
                    if (typeof value === 'function') {
                        store.rootDispatch(value(store.getState()))
                    } else {
                        store.rootDispatch(value)
                    }
                },
            }
        }
    })

    // This will reset the store state to the provided initial state on configuration.
    function destroySubscribersAndResetTheStateToAllStores() {
        entries(stores).forEach(([, store]) => {
            store.destroySubscribers()
            store.resetState()
        })
    }

    function StoresProvider({
        children,
        initialStoresState,
    }: {
        initialStoresState?: {
            [K in keyof T]?: InitialState<T[K]['initialState']>
        }
        children: React.ReactNode
    }) {
        function overrideInitialStoresState() {
            if (initialStoresState) {
                for (const key in initialStoresState) {
                    const storeState = initialStoresState[key]
                    // The keys on the `initialStoresState` are all optional. We only want to
                    // compute the initialState for the available keys.
                    if (typeof storeState === 'undefined') {
                        continue
                    }
                    const ownStore = stores[key]
                    ownStore.setInitialStateFromRoot(storeState)
                }
            }
        }

        const isThisInitialRenderRef = React.useRef(true)
        // We want to override the initial stores state only in initial render.
        if (isThisInitialRenderRef.current) {
            overrideInitialStoresState()
        }
        isThisInitialRenderRef.current = false

        React.useEffect(() => destroySubscribersAndResetTheStateToAllStores, [])

        return (
            <StoresContext.Provider value={stores}>
                {children}
            </StoresContext.Provider>
        )
    }

    return {
        StoresProvider: StoresProvider,
        ...storeAccessors,
    }
}

// ------------------------------------------------------------------//
// --------------------------- Hooks -------------------------------//
// -----------------------------------------------------------------//

type GetState<
    B extends Stores<StoresConfiguration>,
    K extends keyof B
> = ReturnType<B[K]['getState']>

type GetDispatch<
    B extends Stores<StoresConfiguration>,
    K extends keyof B
> = B[K]['dispatch']

function useStore<B extends Stores<StoresConfiguration>, K extends keyof B>(
    storeAccessor: StoreAccessor<B, K>
) {
    const stores = React.useContext(storeAccessor.Context)

    invariant(
        stores,
        `"stores" is undefined. Make sure "storeAccessor" is created by "createContainer".`
    )

    return stores[storeAccessor.getKey()]
}

/**
 * A hook to access the store's state value. Component which uses the hook is automatically bound to the state.
 * Means, the Component will rerender whenever there is stata change.
 * It returns state value.
 *
 * @example
 *
 * import { useStoreValue } from 'restatum'
 * import AppContainer from './AppContainer'
 *
 * export const ToggleComponent = () => {
 *   const toggle = useStoreValue(AppContainer.toggle)
 *   return <div>Toggle is { toggle ? 'on' : 'off' }</div>
 * }
 */
function useStoreValue<
    B extends Stores<StoresConfiguration>,
    K extends keyof B
>(storeAccessor: StoreAccessor<B, K>): GetState<B, K> {
    const { getState, subscribe } = useStore(storeAccessor)

    // Memoize to avoid removing and re-adding subscriptions each time this hook is called.
    const subscription = React.useMemo(
        () => ({
            getCurrentValue: () => getState(),
            subscribe: (callback: any) => {
                const cleanup = subscribe(callback)
                return () => cleanup()
            },
        }),

        [getState, subscribe]
    )

    const state = useSubscription(subscription)

    return state
}

/**
 * A hook to access the store's state value and its associated dispatch. Component which uses the hook is automatically bound to the state.
 * It returns a tuple type for state and dispatch.
 *
 * @example
 *
 * import { useStoreState } from 'restatum'
 * import AppContainer from './AppContainer'
 *
 * export const ToggleComponent = () => {
 *   const [toggle, setToggle] = useStoreState(AppContainer.toggle)
 *   return (
 *     <div>
 *       <span>Toggle is { toggle ? 'on' : 'off' }</span>
 *       <button onClick={() => setToggle(p => !p)}></button>
 *     </div>
 *   )
 * }
 */
function useStoreState<
    B extends Stores<StoresConfiguration>,
    K extends keyof B
>(storeAccessor: {
    Context: React.Context<B | null>
    getKey: () => K
}): [GetState<B, K>, GetDispatch<B, K>] {
    const state = useStoreValue(storeAccessor)
    const { dispatch } = useStore(storeAccessor)
    return [state, dispatch]
}

/**
 * A hook to access the store's dispatch. Component which uses the hook is not bound to the state.
 * Whenever there is a state change, the Component uses the hook will not rerender.
 *
 * @example
 *
 * import { useStoreState } from 'restatum'
 * import AppContainer from './AppContainer'
 *
 * export const ToggleComponent = () => {
 *   const setToggle = useStoreDispatch(AppContainer.toggle)
 *   return (
 *     <button onClick={() => setToggle(p => !p)}></button>
 *   )
 * }
 */
function useStoreDispatch<
    B extends Stores<StoresConfiguration>,
    K extends keyof B
>(storeAccessor: StoreAccessor<B, K>): GetDispatch<B, K> {
    const { dispatch } = useStore(storeAccessor)
    return dispatch
}

/**
 * A hook to subscribe to a store's state. Whenever there is a state change, the passed
 * callback will execute but the Component will not rerender. It receives the latest state.
 *
 * @example
 *
 * import { useStoreState } from 'restatum'
 * import AppContainer from './AppContainer'
 *
 * export const ToggleComponent = () => {
 *   useStoreSubscribe(AppContainer.toggle, state => console.log(state))
 *   return (
 *     <div>Hey! This is a Toggle Component</div>
 *   )
 * }
 */
function useStoreSubscribe<
    B extends Stores<StoresConfiguration>,
    K extends keyof B
>(
    storeAccessor: StoreAccessor<B, K>,
    cb: (state: GetState<B, K>) => void | Callback
) {
    const { subscribe, getState } = useStore(storeAccessor)
    React.useEffect(() => {
        const cleanup = subscribe(() => cb(getState()))
        return () => cleanup()
    }, [cb, subscribe, getState])
}

export {
    createContainer,
    useStoreState,
    useStoreDispatch,
    useStoreValue,
    useStoreSubscribe,
}
