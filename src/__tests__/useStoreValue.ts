import { createContainer, useStoreDispatch, useStoreValue } from '../restatum'
import { renderHook, act } from '@testing-library/react-hooks'
// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/extend-expect'

function runSetup() {
    return createContainer({
        toggle: {
            initialState: false,
        },
    })
}

it('should return the state', () => {
    const Container = runSetup()
    const { result } = renderHook(() => useStoreValue(Container.toggle), {
        wrapper: Container.StoresProvider,
    })

    expect(result.current).toBeFalsy()
})

it('should get the updated state', () => {
    const Container = runSetup()
    const { result } = renderHook(() => useStoreValue(Container.toggle), {
        wrapper: Container.StoresProvider,
    })
    const { result: anotherResult } = renderHook(
        () => useStoreDispatch(Container.toggle),
        {
            wrapper: Container.StoresProvider,
        }
    )

    act(() => {
        anotherResult.current((p: any) => !p)
    })

    expect(result.current).toBeTruthy()

    act(() => {
        anotherResult.current((p: any) => !p)
    })

    expect(result.current).toBeFalsy()
})
