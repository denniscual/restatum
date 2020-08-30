import Store from '../Store'

let store = new Store(true)

afterEach(() => {
    store = new Store(true) as Store<boolean>
})

it('should return the current initialState', () => {
    expect(store.getState()).toBeTruthy()
})

it('should update the state using the dispatch', () => {
    expect(store.getState()).toBeTruthy()
    // update the state
    store.dispatch(false)
    expect(store.getState()).not.toBeTruthy()
    // update the state
    store.dispatch(true)
    expect(store.getState()).toBeTruthy()
})

it('should override the passed initial state', () => {
    expect(store.getState()).toBeTruthy()
    // override the state
    store.setInitialStateFromRoot(false)
    expect(store.getState()).not.toBeTruthy()
})

it('should subscribe to the store and invoke whenever there is a state change', () => {
    const fk = jest.fn()
    store.subscribe(fk)

    store.dispatch(false)
    expect(fk).toHaveBeenCalledTimes(1)

    store.dispatch(true)
    expect(fk).toHaveBeenCalledTimes(2)
})

it('should remove the subscriber', () => {
    const fk = jest.fn()
    const cancel = store.subscribe(fk)

    store.dispatch(false)
    expect(fk).toHaveBeenCalledTimes(1)
    fk.mockClear()

    cancel()
    store.dispatch(true)
    expect(fk).toHaveBeenCalledTimes(0)
})

it('should destroy all of the subscribers', () => {
    const fk = jest.fn()
    store.subscribe(fk)

    store.dispatch(false)
    expect(fk).toHaveBeenCalledTimes(1)
    fk.mockClear()

    store.destroySubscribers()
    store.dispatch(true)
    expect(fk).toHaveBeenCalledTimes(0)
})

it('should reset the current state', () => {
    expect(store.getState()).toBeTruthy()
    // update the state
    store.dispatch(false)
    expect(store.getState()).not.toBeTruthy()
    // reset the state
    store.resetState()
    expect(store.getState()).toBeTruthy()
})
