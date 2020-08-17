import React from 'react'
import invariant from 'invariant'
import { useSubscription } from 'use-subscription'
import { isContextType, entries } from './utils'
import RootStore from './Store'
import { Callback, InitialState } from './utils/types'

// TODO:
// - Do some other reviews.
// - add some comments to all higher level apis.
// - create stunning documentation. Create great sample point to codesandbox.
// - check again our current repo for restatum. Will improve the DX, as much as possible the DX is the same on CRA. Then the build like wepback blah blabh. Check the eslint.
// - add travis or maybe just use github or anything. low prio.
// - add nextime the logic for returning a stores object as a key of createContainer to subscribe to all of the stores state. low prio.
//   check the below logic.

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

type Store<S, R> = {
    getState: () => S
    dispatch: React.Dispatch<InitActionType<S, R>>
    subscribe: (cb: Callback) => Callback
    destroySubscribers: Callback
    setInitialStateFromRoot: (nextState: S) => void
}

type Stores<T extends StoresConfiguration> = {
    [K in keyof T]: Store<T[K]['initialState'], T[K]['reducer']>
}

type StoreAccessors<T extends StoresConfiguration, B extends Stores<T>> = {
    [K in keyof T]: {
        Context: React.Context<B | null>
        getKey: () => K
    }
}

type StoreAccessor<B, K> = { Context: React.Context<B | null>; getKey: () => K }

type GetState<
    B extends Stores<StoresConfiguration>,
    K extends keyof B
> = ReturnType<B[K]['getState']>

type GetDispatch<
    B extends Stores<StoresConfiguration>,
    K extends keyof B
> = B[K]['dispatch']

// ------------------------------------------------------------------//
// ----------------------- createContainer --------------------------//
// -----------------------------------------------------------------//

function createContainer<T extends StoresConfiguration>(configuration: T) {
    invariant(
        typeof configuration === 'object' && !Array.isArray(configuration),
        `Invalid configuration type. "createStore" is expecting type object but receives ${typeof configuration}.`
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

    function destroySubscribersToAllStores() {
        entries(stores).forEach(([, store]) => {
            store.destroySubscribers()
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
        React.useMemo(
            function settingUpTheInitialStoresState() {
                if (initialStoresState) {
                    for (const key in initialStoresState) {
                        const storeState = initialStoresState[key]
                        // The keys on the `initialStoresState` are all optional. We only want to
                        // compute the initialState for the available keys.
                        if (typeof storeState === 'undefined') {
                            return
                        }
                        const ownStore = stores[key]
                        ownStore.setInitialStateFromRoot(storeState)
                    }
                }
            },
            // We need to disable the eslint in here because we only want to execute the
            // the setting of initialStoresState to their corresponding store
            // once, in initial render of the Provider.
            // eslint-disable-next-line react-hooks/exhaustive-deps
            []
        )

        React.useEffect(() => destroySubscribersToAllStores, [])

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

function useStore<B extends Stores<StoresConfiguration>, K extends keyof B>(
    storeAccessor: StoreAccessor<B, K>
) {
    invariant(
        isContextType(storeAccessor.Context),
        `Invalid Context type. Make sure that the passed Context is created by "React.createContext".`
    )

    const stores = React.useContext(storeAccessor.Context)

    invariant(
        stores,
        `"stores" is undefined. Make sure the passed Context is correct.`
    )

    return stores[storeAccessor.getKey()]
}

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

function useStoreDispatch<
    B extends Stores<StoresConfiguration>,
    K extends keyof B
>(storeAccessor: StoreAccessor<B, K>): GetDispatch<B, K> {
    const { dispatch } = useStore(storeAccessor)
    return dispatch
}

function useStoreSubscribe<
    B extends Stores<StoresConfiguration>,
    K extends keyof B
>(storeAccessor: StoreAccessor<B, K>, cb: Callback) {
    const { subscribe } = useStore(storeAccessor)
    React.useEffect(() => {
        const cleanup = subscribe(cb)
        return () => cleanup()
    }, [cb, subscribe])
}

export {
    createContainer,
    useStoreState,
    useStoreDispatch,
    useStoreValue,
    useStoreSubscribe,
}
