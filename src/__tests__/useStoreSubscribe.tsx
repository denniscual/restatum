import React from 'react'
import { renderHook, act } from '@testing-library/react-hooks'
import {
    createContainer,
    useStoreSubscribe,
    useStoreState,
    useStoreDispatch,
} from '../restatum'
import { screen, render, fireEvent } from '@testing-library/react'
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
    fakeFn.mockClear()

    // update then assert
    act(() => {
        result.current[1](false)
    })
    expect(result.current[0]).not.toBeTruthy()
    expect(fakeFn).toHaveBeenCalledTimes(1)
})

it('should invoke the passed callback with the latest state provided as arugment', () => {
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
    expect(fakeFn).toHaveBeenCalledWith(true)
    fakeFn.mockClear()

    // update then assert
    act(() => {
        result.current[1](false)
    })
    expect(result.current[0]).not.toBeTruthy()
    expect(fakeFn).toHaveBeenCalledTimes(1)
    expect(fakeFn).toHaveBeenCalledWith(false)
})

it('should not rerender the Component which subscribes to a state', () => {
    /**
     * Goals:
     * Check if the Component will only re-render if the consumed state 
     was changed.
     *
    */
    const Container = createContainer({
        toggle: {
            initialState: false,
        },
    })

    const handleToggleStateChange = jest.fn()
    const subscribeToToggleState = jest.fn()

    function ToggleButton() {
        const setToggle = useStoreDispatch(Container.toggle)
        handleToggleStateChange()
        useStoreSubscribe(Container.toggle, subscribeToToggleState)
        return <button onClick={() => setToggle(true)}>Update toggle</button>
    }

    function Toggle() {
        const [toggle] = useStoreState(Container.toggle)
        return (
            <span data-testid="toggle-text">
                Toggle {toggle ? 'on' : 'off'}
            </span>
        )
    }

    function Root() {
        return (
            <Container.StoresProvider>
                <Toggle />
                <ToggleButton />
            </Container.StoresProvider>
        )
    }

    render(<Root />)

    expect(screen.getByTestId('toggle-text')).toHaveTextContent('Toggle off')
    expect(handleToggleStateChange).toHaveBeenCalledTimes(1)
    handleToggleStateChange.mockClear()

    // update toggle
    fireEvent.click(screen.getByText(/update toggle/i))
    // ToggleButton doesn't rerender.
    expect(handleToggleStateChange).toHaveBeenCalledTimes(0)
    expect(subscribeToToggleState).toHaveBeenCalledTimes(1)
    // Toggle gets render.
    expect(screen.getByTestId('toggle-text')).toHaveTextContent('Toggle on')
})
