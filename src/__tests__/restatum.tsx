import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import {
    useStoreValue,
    useStoreState,
    useStoreDispatch,
    createContainer,
} from '../restatum'
// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/extend-expect'

type AddTodo = {
    type: 'add'
    payload: string
}

type DeleteTodo = {
    type: 'delete'
    payload: number
}

const Container = createContainer({
    search: {
        initialState: '',
    },
    todos: {
        initialState: [],
        reducer(state: string[], action: AddTodo | DeleteTodo) {
            if (action.type === 'add') {
                return state.concat(action.payload)
            }
            if (action.type === 'delete') {
                const newState = [...state]
                newState.splice(action.payload, 1)
                return newState
            }
            return state
        },
    },
})

/**
 * Search
 */

function Search() {
    const [search, setSearch] = useStoreState(Container.search)
    return (
        <header>
            <div>
                Search key <span data-testid="search key label">{search}</span>
            </div>
            <label htmlFor="search">Search</label>
            <input
                type="text"
                id="search"
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
            />
        </header>
    )
}

/**
 * Todo
 */

function Todo({ todo, idx }: { todo: string; idx: number }) {
    const dispatch = useStoreDispatch(Container.todos)
    return (
        <li>
            <label htmlFor={todo}>{todo}</label>
            <input
                type="button"
                id={todo}
                onClick={() => dispatch({ type: 'delete', payload: idx })}
                value="Delete todo"
            />
        </li>
    )
}

function AddTodo() {
    const dispatch = useStoreDispatch(Container.todos)
    return (
        <footer>
            <button
                onClick={() => dispatch({ type: 'add', payload: 'Todo 1' })}
            >
                Add todo
            </button>
        </footer>
    )
}

function Todos() {
    const todos = useStoreValue(Container.todos)
    return (
        <div>
            <div>
                Todos count
                <span data-testid="todos count">{todos.length}</span>
            </div>
            <ul>
                {todos.map((todo, idx) => (
                    <Todo key={todo} todo={todo} idx={idx} />
                ))}
            </ul>
            <AddTodo />
        </div>
    )
}

function renderSearchAndTodos() {
    return render(
        <Container.StoresProvider>
            <main>
                <Search />
                <Todos />
            </main>
        </Container.StoresProvider>
    )
}

describe('Basic usage', () => {
    it('render a Component', () => {
        const { container } = renderSearchAndTodos()

        expect(container.firstChild).toMatchSnapshot()

        fireEvent.change(screen.getByDisplayValue(''), { value: 'Zion' })
        expect(container.firstChild).toMatchSnapshot()
    })
})

describe('state', () => {
    describe('useStoreState', () => {
        it('changes the value of search', () => {
            /**
             * Goals:
             * 1. Check the initial display.
             * 2. Check if the state is changing when typing.
             */
            renderSearchAndTodos()
            const searchKeyLabel = screen.getByTestId('search key label')

            // 1.
            expect(searchKeyLabel).toBeEmpty()

            // 2.
            fireEvent.change(screen.getByDisplayValue(''), {
                target: {
                    value: 'Zion',
                },
            })
            expect(searchKeyLabel).toHaveTextContent('Zion')
        })
    })
})

describe('reducer', () => {
    describe('store value and store dispatch', () => {
        it('updates the todos', () => {
            /**
             * Goals:
             * 1. Check the initial display.
             * 2. Add todo.
             * 3. Delete todo.
             */
            renderSearchAndTodos()
            const todosCountEl = screen.getByTestId('todos count')
            const todoListEl = screen.getByRole('list')

            // 1.
            expect(todosCountEl).toHaveTextContent('0')
            expect(todoListEl).toBeEmpty()

            // 2.
            fireEvent.click(screen.getByText(/Add todo/i))
            expect(todosCountEl).toHaveTextContent('1')
            expect(todoListEl).not.toBeEmpty()
            expect(todoListEl).toContainElement(screen.getByText('Todo 1'))

            // 3.
            fireEvent.click(screen.getByLabelText('Todo 1'))
            expect(todosCountEl).toHaveTextContent('0')
            expect(todoListEl).toBeEmpty()
        })
    })
})

