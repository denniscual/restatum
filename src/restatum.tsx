import React from 'react'
import invariant from 'invariant'
import { useSubscription } from 'use-subscription'
import { entries } from './utils'
import RootStoreState from './StoreState'
import { Callback, InitialState } from './utils/types'

// TODO: Double check the change name variables. Also change the documentation
// based on the new terminology. This changes would be a breaking changes! because we change some apis
// which is not backward-compatible.

type Reducer = {
    (state: any, action: any): any
}

type InitActionType<S, R> = R extends (state: any, action: infer A) => void
    ? A
    : React.SetStateAction<S>

type StoreConfiguration<T = any> = {
    [key in keyof T]: {
        initialState: any
        reducer?: Reducer
    }
}

interface StoreState<S, R> extends Omit<RootStoreState<S>, 'rootDispatch'> {
    dispatch: React.Dispatch<InitActionType<S, R>>
}

type StoreStateCollection<T extends StoreConfiguration> = {
    [K in keyof T]: StoreState<T[K]['initialState'], T[K]['reducer']>
}

type StateAccessor<B, K> = { Context: React.Context<B | null>; getKey: () => K }

type StateAccessors<
    T extends StoreConfiguration,
    B extends StoreStateCollection<T>
> = {
    [K in keyof T]: StateAccessor<B, K>
}

// ------------------------------------------------------------------//
// ----------------------- createContainer --------------------------//
// -----------------------------------------------------------------//

/**
 * Creates a store container. A `Container` holds the store which is configured based on the configuration/arguments.
 * It returns `stateAccessors` and a `StoreProvider` that restricts the access of the stores.
 *
 * @example
 *
 * import { createContainer } from 'restatum'
 *
 * // toggle is stateAccessor which is used to access a store state via hooks.
 * const { StoreProvider, toggle } = createContainer({
 *   toggle: {
 *     initialState: false
 *   }
 * })
 * export default {
 *   StoreProvider,
 *   toggle
 * }
 */
function createContainer<T extends StoreConfiguration>(configuration: T) {
    invariant(
        typeof configuration === 'object' && !Array.isArray(configuration),
        `Invalid configuration type. "createContainer" is expecting type object but receives ${typeof configuration}.`
    )

    const stateCollection: StoreStateCollection<T> = {} as any
    // This holds the Context and the key to get the correct store state.
    const stateAccessors: StateAccessors<T, typeof stateCollection> = {} as any
    const StoreContext = React.createContext<typeof stateCollection | null>(
        null
    )

    function addStateStateAccessor(key: keyof T) {
        return {
            Context: StoreContext,
            getKey() {
                return key
            },
        }
    }

    // Adding state.
    entries(configuration).forEach(([key, value]) => {
        // we use this value to access the Context inside the Component.
        stateAccessors[key] = addStateStateAccessor(key)

        const store = new RootStoreState(value.initialState)
        function addState() {
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
            stateCollection[key] = {
                ...addState(),
                dispatch(action: any) {
                    const nextState = reducer(store.getState(), action)
                    store.rootDispatch(nextState)
                },
            }
        } else {
            stateCollection[key] = {
                ...addState(),
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
    function destroySubscribersAndResetTheStateToAllStoreState() {
        entries(stateCollection).forEach(([, storeState]) => {
            storeState.destroySubscribers()
            storeState.resetState()
        })
    }

    function StoreProvider({
        children,
        initialStoreState,
    }: {
        initialStoreState?: {
            [K in keyof T]?: InitialState<T[K]['initialState']>
        }
        children: React.ReactNode
    }) {
        function overrideInitialStoresState() {
            if (initialStoreState) {
                for (const key in initialStoreState) {
                    const initState = initialStoreState[key]
                    // The keys on the `initialStoreState` are all optional. We only want to
                    // compute the initialState for the available keys.
                    if (typeof initState === 'undefined') {
                        continue
                    }
                    const ownStore = stateCollection[key]
                    ownStore.setInitialStateFromRoot(initState)
                }
            }
        }

        const isThisInitialRenderRef = React.useRef(true)
        // We want to override the initial stores state only in initial render.
        if (isThisInitialRenderRef.current) {
            overrideInitialStoresState()
        }
        isThisInitialRenderRef.current = false

        React.useEffect(
            () => destroySubscribersAndResetTheStateToAllStoreState,
            []
        )

        return (
            <StoreContext.Provider value={stateCollection}>
                {children}
            </StoreContext.Provider>
        )
    }

    return {
        StoreProvider,
        ...stateAccessors,
    }
}

// ------------------------------------------------------------------//
// --------------------------- Hooks -------------------------------//
// -----------------------------------------------------------------//

type GetState<
    B extends StoreStateCollection<StoreConfiguration>,
    K extends keyof B
> = ReturnType<B[K]['getState']>

type GetDispatch<
    B extends StoreStateCollection<StoreConfiguration>,
    K extends keyof B
> = B[K]['dispatch']

function useStore<
    B extends StoreStateCollection<StoreConfiguration>,
    K extends keyof B
>(stateAccessor: StateAccessor<B, K>) {
    const stores = React.useContext(stateAccessor.Context)

    invariant(
        stores,
        `"stores" is undefined. Make sure "stateAccessor" is created by "createContainer".`
    )

    return stores[stateAccessor.getKey()]
}

/**
 * A hook to access the store state value. Component which uses the hook is automatically bound to the state.
 * Means, the Component will rerender whenever there is stata change.
 * It returns state value.
 *
 * @example
 *
 * import { useValue } from 'restatum'
 * import AppContainer from './AppContainer'
 *
 * export const ToggleComponent = () => {
 *   const toggle = useValue(AppContainer.toggle)
 *   return <div>Toggle is { toggle ? 'on' : 'off' }</div>
 * }
 */
function useValue<
    B extends StoreStateCollection<StoreConfiguration>,
    K extends keyof B
>(stateAccessor: StateAccessor<B, K>): GetState<B, K> {
    const { getState, subscribe } = useStore(stateAccessor)

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
 * A hook to access the store state value and its associated dispatch. Component which uses the hook is automatically bound to the state.
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
    B extends StoreStateCollection<StoreConfiguration>,
    K extends keyof B
>(stateAccessor: {
    Context: React.Context<B | null>
    getKey: () => K
}): [GetState<B, K>, GetDispatch<B, K>] {
    const state = useValue(stateAccessor)
    const { dispatch } = useStore(stateAccessor)
    return [state, dispatch]
}

/**
 * A hook to access the store state dispatch. Component which uses the hook is not bound to the state.
 * Whenever there is a state change, the Component uses the hook will not rerender.
 *
 * @example
 *
 * import { useStoreState } from 'restatum'
 * import AppContainer from './AppContainer'
 *
 * export const ToggleComponent = () => {
 *   const setToggle = useDispatch(AppContainer.toggle)
 *   return (
 *     <button onClick={() => setToggle(p => !p)}></button>
 *   )
 * }
 */
function useDispatch<
    B extends StoreStateCollection<StoreConfiguration>,
    K extends keyof B
>(stateAccessor: StateAccessor<B, K>): GetDispatch<B, K> {
    const { dispatch } = useStore(stateAccessor)
    return dispatch
}

/**
 * A hook to subscribe to a store state. Whenever there is a state change, the passed
 * callback will execute but the Component will not rerender. It receives the latest state.
 *
 * @example
 *
 * import { useSubscribe } from 'restatum'
 * import AppContainer from './AppContainer'
 *
 * export const ToggleComponent = () => {
 *   useSubscribe(AppContainer.toggle, state => console.log(state))
 *   return (
 *     <div>Hey! This is a Toggle Component</div>
 *   )
 * }
 */
function useSubscribe<
    B extends StoreStateCollection<StoreConfiguration>,
    K extends keyof B
>(
    stateAccessor: StateAccessor<B, K>,
    cb: (state: GetState<B, K>) => void | Callback
) {
    const { subscribe, getState } = useStore(stateAccessor)
    React.useEffect(() => {
        const cleanup = subscribe(() => cb(getState()))
        return () => cleanup()
    }, [cb, subscribe, getState])
}

export { createContainer, useStoreState, useDispatch, useValue, useSubscribe }
