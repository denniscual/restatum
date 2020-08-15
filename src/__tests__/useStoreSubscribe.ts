import { renderHook, act } from '@testing-library/react-hooks'
import { createContainer, useStoreSubscribe, useStoreState } from '../restatum'
// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/extend-expect'

const AppContainer = createContainer({
    toggle: {
        initialState: false,
    },
})

function useApp(cb: () => void) {
    const storeState = useStoreState(AppContainer.toggle)
    useStoreSubscribe(AppContainer.toggle, cb)

    return storeState
}

it('should invoke the passed callback to subscribe whenever the state will changed', () => {
    const fakeFn = jest.fn()
    const { result } = renderHook(() => useApp(fakeFn), {
        wrapper: AppContainer.StoresProvider,
    })

    expect(result.current[0]).toBeFalsy()
    expect(typeof result.current[1]).toBe('function')

    // update then assert
    act(() => {
        result.current[1](true)
    })
    expect(result.current[0]).toBeTruthy()
    expect(fakeFn).toHaveBeenCalledTimes(1)
    fakeFn.mockReset()

    // update then assert
    act(() => {
        result.current[1](false)
    })
    expect(result.current[0]).not.toBeTruthy()
    expect(fakeFn).toHaveBeenCalledTimes(1)
})
