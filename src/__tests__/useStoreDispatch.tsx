import React from 'react'
import { createContainer, useStoreDispatch, useStoreState } from '../restatum'
import { renderHook, act } from '@testing-library/react-hooks'
import { screen, render, fireEvent } from '@testing-library/react'
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

it('should not rerender the Component which has an access to dispatch but not on the state which currently updating', () => {
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
        searchKey: {
            initialState: '',
        },
    })

    const handleToggleStateChange = jest.fn()
    function ToggleButton() {
        const setToggle = useStoreDispatch(Container.toggle)
        handleToggleStateChange()
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
    // Toggle gets render.
    expect(screen.getByTestId('toggle-text')).toHaveTextContent('Toggle on')
})
