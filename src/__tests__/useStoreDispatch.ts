import { createContainer, useStoreDispatch, useStoreState } from '../restatum'
import { renderHook, act } from '@testing-library/react-hooks'
// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/extend-expect'

function runSetup() {
    const values = createContainer({
        toggle: {
            initialState: false,
        },
    })

    return values
}

it('should return the state dispatch', () => {
    const values = runSetup()
    const { result } = renderHook(() => useStoreDispatch(values.toggle), {
        wrapper: values.StoresProvider,
    })

    expect(typeof result.current).toBe('function')
    expect(result.current.length).toBe(1)
})

it('should update the toggle state', () => {
    const values = runSetup()
    const { result } = renderHook(() => useStoreDispatch(values.toggle), {
        wrapper: values.StoresProvider,
    })
    const { result: anotherResult } = renderHook(
        () => useStoreState(values.toggle),
        {
            wrapper: values.StoresProvider,
        }
    )

    act(() => {
        result.current((p: any) => !p)
    })

    expect(anotherResult.current[0]).toBeTruthy()

    act(() => {
        result.current((p: any) => !p)
    })

    expect(anotherResult.current[0]).toBeFalsy()
})
