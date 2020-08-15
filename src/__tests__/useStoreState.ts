import { createContainer, useStoreState } from '../index'
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

it('should return a tuple type with the state and the dispatch', () => {
    const Container = runSetup()
    const { result } = renderHook(() => useStoreState(Container.toggle), {
        wrapper: Container.StoresProvider,
    })
    const [toggle, setToggle] = result.current

    expect(toggle).toBeFalsy()
    expect(typeof setToggle).toBe('function')
    expect(setToggle.length).toBe(1)
})

it('should update the toggle state', () => {
    const Container = runSetup()
    const { result } = renderHook(() => useStoreState(Container.toggle), {
        wrapper: Container.StoresProvider,
    })

    act(() => {
        result.current[1]((p) => !p)
    })

    expect(result.current[0]).toBeTruthy()

    act(() => {
        result.current[1]((p) => !p)
    })

    expect(result.current[0]).toBeFalsy()
})
