import React from 'react'
import { createContainer, useDispatch, useValue } from '../restatum'
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
    const { result } = renderHook(() => useValue(Container.toggle), {
        wrapper: Container.StoreProvider,
    })

    expect(result.current).toBeFalsy()
})

it('should get the updated state', () => {
    const Container = runSetup()
    const { result } = renderHook(() => useValue(Container.toggle), {
        wrapper: Container.StoreProvider,
    })
    const { result: anotherResult } = renderHook(
        () => useDispatch(Container.toggle),
        {
            wrapper: Container.StoreProvider,
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
        const toggle = useValue(Container.toggle)
        handleToggleStateChange()
        return (
            <span data-testid="toggle-text">
                Toggle {toggle ? 'on' : 'off'}
            </span>
        )
    }

    function Actions() {
        const setSearchKey = useDispatch(Container.searchKey)
        const setToggle = useDispatch(Container.toggle)

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
            <Container.StoreProvider>
                <Toggle />
                <Actions />
            </Container.StoreProvider>
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
