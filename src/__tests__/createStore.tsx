import React from 'react'
import { render, screen } from '@testing-library/react'
import { createStore, useValue } from '../core'
// TODO: Move this import to a single file.
// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/extend-expect'

const AppContainer = createStore({
    toggle: {
        initialState: false,
    },
    todos: {
        initialState: [],
    },
})

function createApp({
    toggle = false,
    todos = [],
}: {
    toggle?: boolean | (() => boolean)
    todos?: string[] | (() => string[])
}) {
    const AppContainer = createStore({
        toggle: {
            initialState: false,
        },
        todos: {
            initialState: [] as string[],
        },
    })

    function Todos() {
        const todos = useValue(AppContainer.todos)
        return (
            <ul data-testid="todos">
                {todos.map((todo) => (
                    <li key={todo}>{todo}</li>
                ))}
            </ul>
        )
    }

    function App() {
        return (
            <AppContainer.StoreProvider
                initialStoreState={{
                    toggle,
                    todos,
                }}
            >
                <Todos />
            </AppContainer.StoreProvider>
        )
    }

    return App
}

it('should return AppContainer which has StoreProvider key and the stores key', () => {
    /**
     * "ToggleContainer" must return "StoreProvider". Container holds the stores and every store
     * has a key of "Context" and "getKey".
     * */

    // Stores
    expect(AppContainer.toggle.getKey()).toBe('toggle')
    expect(AppContainer.todos.getKey()).toBe('todos')
})

it('should use the initialState in createStore', () => {
    const App = createApp({
        todos: [],
    })

    render(<App />)

    expect(screen.getByTestId('todos')).toBeEmpty()
})

it('should override the initialState in createStore if we passed initialState to the StoreProvider', () => {
    const App = createApp({
        todos: ['zion', 'irish', 'dennis'],
    })

    render(<App />)

    expect(screen.getByTestId('todos')).not.toBeEmpty()
    expect(screen.getByText('zion')).toBeInTheDocument()
    expect(screen.getByText('irish')).toBeInTheDocument()
    expect(screen.getByText('dennis')).toBeInTheDocument()
})

it('should invoke the init todos fn only once in initial render', () => {
    const initTodosFn = jest.fn().mockReturnValue(['zion', 'irish', 'dennis'])
    const App = createApp({
        todos: initTodosFn,
    })

    // `initTodosFn` must be invoked in initial render.
    const { rerender } = render(<App />)
    expect(initTodosFn).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('todos')).not.toBeEmpty()
    expect(screen.getByText('zion')).toBeInTheDocument()
    expect(screen.getByText('irish')).toBeInTheDocument()
    expect(screen.getByText('dennis')).toBeInTheDocument()

    // If the Component gets re-render, the `initTodosFn` will not invoke again.
    rerender(<App />)
    expect(initTodosFn).toHaveBeenCalledTimes(1)
})
