import React from 'react'
import { render, screen } from '@testing-library/react'
import { createContainer, useStoreValue, isContextType } from '../index'
import { isValidElementType } from 'react-is'
// TODO: Move this import to a single file.
// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/extend-expect'

const AppContainer = createContainer({
    toggle: {
        initialState: false,
    },
    todos: {
        initialState: [],
    },
})

function renderApp({
    toggle = false,
    todos = [],
}: {
    toggle?: boolean
    todos?: string[]
}) {
    const AppContainer = createContainer({
        toggle: {
            initialState: false,
        },
        todos: {
            initialState: [],
        },
    })

    function Todos() {
        const todos = useStoreValue(AppContainer.todos)
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
            <AppContainer.StoresProvider
                // @ts-ignore
                initialStoresState={{
                    toggle,
                    todos,
                }}
            >
                <Todos />
            </AppContainer.StoresProvider>
        )
    }

    return render(<App />)
}

it('should return AppContainer which has StoresProvider key and the stores key', () => {
    /**
     * "ToggleContainer" must return "StoresProvider". Container holds the stores and every store
     * has a key of "Context" and "getKey".
     * */

    expect(isValidElementType(AppContainer.StoresProvider)).toBeTruthy()
    // Stores
    expect(AppContainer.toggle.getKey()).toBe('toggle')
    expect(isContextType(AppContainer.toggle.Context)).toBeTruthy()
    expect(AppContainer.todos.getKey()).toBe('todos')
    expect(isContextType(AppContainer.todos.Context)).toBeTruthy()
})

it('should use the initialState in createContainer', () => {
    renderApp({
        todos: [],
    })

    expect(screen.getByTestId('todos')).toBeEmpty()
})

it('should override the initialState in createContainer if we passed initialState to the StoresProvider', () => {
    renderApp({
        todos: ['zion', 'irish', 'dennis'],
    })

    expect(screen.getByTestId('todos')).not.toBeEmpty()
    expect(screen.getByText('zion')).toBeInTheDocument()
    expect(screen.getByText('irish')).toBeInTheDocument()
    expect(screen.getByText('dennis')).toBeInTheDocument()
})
