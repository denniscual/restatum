import React from 'react'
import invariant from 'invariant'
import { isValidElementType } from 'react-is'
import { useSubscription } from 'use-subscription'

type InitialState<S> = S | (() => S)

function isInitialStateAFunction<S>(
    initialState: InitialState<S>
): initialState is () => S {
    return typeof initialState === 'function'
}

type Callback = () => void

function entries<T extends object, K extends keyof T>(object: T) {
    return Object.entries(object) as [K, T[K]][]
}

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

type StoreValues<T extends StoresConfiguration, B extends Stores<T>> = {
    [K in keyof T]: {
        Context: React.Context<B | null>
        getKey: () => K
    }
}

type GetState<
    B extends Stores<StoresConfiguration>,
    K extends keyof B
> = ReturnType<B[K]['getState']>

type GetDispatch<
    B extends Stores<StoresConfiguration>,
    K extends keyof B
> = B[K]['dispatch']

class RootStore<S> {
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

function isContextType<T>(Context: React.Context<T>) {
    return (
        typeof Context === 'object' &&
        isValidElementType(Context.Provider) &&
        isValidElementType(Context.Consumer)
    )
}

function createContainer<T extends StoresConfiguration>(configuration: T) {
    invariant(
        typeof configuration === 'object' && !Array.isArray(configuration),
        `Invalid configuration type. "createStore" is expecting type object but receives ${typeof configuration}.`
    )

    const stores: Stores<T> = {} as any
    // This holds the Context and the key to get the correct store.
    const storeValues: StoreValues<T, typeof stores> = {} as any
    const StoresContext = React.createContext<typeof stores | null>(null)

    function addStoreValue(key: keyof T) {
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
        storeValues[key] = addStoreValue(key)

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
        ...storeValues,
    }
}

function useStoreValue<
    B extends Stores<StoresConfiguration>,
    K extends keyof B
>(storeValue: {
    Context: React.Context<B | null>
    getKey: () => K
}): GetState<B, K> {
    invariant(
        isContextType(storeValue.Context),
        `Invalid Context type. Make sure that the passed Context is created by "React.createContext".`
    )

    const stores = React.useContext(storeValue.Context)

    invariant(
        stores,
        `"stores" is undefined. Make sure the passed Context is correct.`
    )

    const { getState, subscribe } = stores[storeValue.getKey()]

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
>(storeValue: {
    Context: React.Context<B | null>
    getKey: () => K
}): [GetState<B, K>, GetDispatch<B, K>] {
    invariant(
        isContextType(storeValue.Context),
        `Invalid Context type. Make sure that the passed Context is created by "React.createContext".`
    )

    const stores = React.useContext(storeValue.Context)

    invariant(
        stores,
        `"stores" is undefined. Make sure the passed Context is correct.`
    )

    const state = useStoreValue(storeValue)

    const { dispatch } = stores[storeValue.getKey()]

    return [state, dispatch]
}

function useStoreDispatch<
    B extends Stores<StoresConfiguration>,
    K extends keyof B
>(storeValue: {
    Context: React.Context<B | null>
    getKey: () => K
}): GetDispatch<B, K> {
    invariant(
        isContextType(storeValue.Context),
        `Invalid Context type. Make sure that the passed Context is created by "React.createContext".`
    )

    const stores = React.useContext(storeValue.Context)

    invariant(
        stores,
        `"stores" is undefined. Make sure the passed Context is correct.`
    )

    const { dispatch } = stores[storeValue.getKey()]

    return dispatch
}

function useStoreSubscribe<
    B extends Stores<StoresConfiguration>,
    K extends keyof B
>(
    storeValue: { Context: React.Context<B | null>; getKey: () => K },
    cb: Callback
) {
    invariant(
        isContextType(storeValue.Context),
        `Invalid Context type. Make sure that the passed Context is created by "React.createContext".`
    )

    const stores = React.useContext(storeValue.Context)

    invariant(
        stores,
        `"stores" is undefined. Make sure the passed Context is correct.`
    )

    const { subscribe } = stores[storeValue.getKey()]

    React.useEffect(() => {
        const cleanup = subscribe(cb)
        return () => cleanup()
    }, [cb, subscribe])
}

export {
    isContextType,
    createContainer,
    useStoreState,
    useStoreDispatch,
    useStoreValue,
    useStoreSubscribe,
}
