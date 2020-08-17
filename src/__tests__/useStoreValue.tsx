import React from 'react'
import { createContainer, useStoreDispatch, useStoreValue } from '../restatum'
import { renderHook, act } from '@testing-library/react-hooks'
import { fireEvent, render, screen } from '@testing-library/react'
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

it('should only rerender if the consumed state was changed', () => {
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
    // Toggle is subscribing to the `toggle`. Will only render if the toggle was changed.
    function Toggle() {
        const toggle = useStoreValue(Container.toggle)
        handleToggleStateChange()
        return (
            <span data-testid="toggle-text">
                Toggle {toggle ? 'on' : 'off'}
            </span>
        )
    }

    function Actions() {
        const setSearchKey = useStoreDispatch(Container.searchKey)
        const setToggle = useStoreDispatch(Container.toggle)

        return (
            <div>
                <button onClick={() => setSearchKey('zion')}>
                    Update search key
                </button>
                <button onClick={() => setToggle(true)}>Update toggle</button>
            </div>
        )
    }

    function Root() {
        return (
            <Container.StoresProvider>
                <Toggle />
                <Actions />
            </Container.StoresProvider>
        )
    }

    render(<Root />)

    expect(screen.getByTestId('toggle-text')).toHaveTextContent('Toggle off')
    expect(handleToggleStateChange).toHaveBeenCalledTimes(1)
    handleToggleStateChange.mockClear()

    // Fire an update for search
    fireEvent.click(screen.getByText(/update search key/i))
    expect(handleToggleStateChange).not.toHaveBeenCalled()
    expect(screen.getByTestId('toggle-text')).toHaveTextContent('Toggle off')
    handleToggleStateChange.mockClear()

    // Fire an update for toggle.
    fireEvent.click(screen.getByText(/update toggle/i))
    expect(handleToggleStateChange).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('toggle-text')).toHaveTextContent('Toggle on')
})
