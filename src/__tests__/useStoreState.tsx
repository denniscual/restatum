import React from 'react'
import { createContainer, useStoreState } from '../restatum'
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
        const [toggle, setToggle] = useStoreState(Container.toggle)
        handleToggleStateChange()
        return (
            <div>
                <span data-testid="toggle-text">
                    Toggle {toggle ? 'on' : 'off'}
                </span>
                <button onClick={() => setToggle(true)}>Update toggle</button>
            </div>
        )
    }

    function Search() {
        const [, setSearchKey] = useStoreState(Container.searchKey)

        return (
            <button onClick={() => setSearchKey('zion')}>
                Update search key
            </button>
        )
    }

    function Root() {
        return (
            <Container.StoresProvider>
                <Toggle />
                <Search />
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
