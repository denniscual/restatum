# restatum
> Enjoy managing your shared state with restatum

[![NPM](https://img.shields.io/npm/v/restatum.svg)](https://www.npmjs.com/package/restatum) [![Build Status](https://travis-ci.org/denniscual/restatum.svg?branch=master)](https://travis-ci.org/denniscual/restatum)

Managing your application state must be easy and straightforward. "restatum" is a minimal and fast library 
which provides you these features in Reactish way. It uses same and well-known approach like [React.useState](https://reactjs.org/docs/hooks-reference.html#usestate) and [React.useReducer](https://reactjs.org/docs/hooks-reference.html#usereducer) for handling your state, so integrating it into your app is a breeze!

```bash
npm install --save restatum
or
yarn add restatum
```

## First, create a Container which holds your stores
```tsx
import { createContainer } from 'restatum'

const CounterContainer = createContainer({
    count: {
        initialState: 0,
    },
})
```

## Wrap your React tree
```jsx
import CounterContainer from './AppContainer'

function App() {
    return (
        <CounterContainer.StoresProvider>
            <Counter />
        </CounterContainer.StoresProvider>
    )
}
```

## Lastly, bind your Components!
```jsx
import { useStoreState } from 'restatum'
import CounterContainer from './AppContainer'

function Counter() {
    const [count, setCount] = useStoreState(CounterContainer.count)
    return (
        <div>
            <span>Count: {count}</span>
            <button onClick={() => setCount((p) => ++p)}>Increment Counter</button>
        </div>
    )
}
```

### Why restatum?
  - simple and uses hooks for consuming your state.
  - uses same approach like `React.useState` and `React.useReducer`.
  - having multiple stores instead of giant single store can make your App more performant.
  - wraps your React tree to distinguish what Components are accessing the stores.

## Recipes

### Reducer sample
Above, we uses `React.useState` approach. This is the simple form of managing your state with restatum. 
If you want to manage your state just like `React.useReducer`, then pass a `reducer` method to a store 
configuration.

```jsx
const AppContainer = createContainer({
    todos: {
        initialState: []
        reducer(state, action) {
            // return the new state
            return state
        }
    }
})

function Todos() {
    const [todos, dispatch] = useStoreState(AppContainer.todos)

    return (
        <ul>{todos.map(todo => <li key={todo}>{todo}</li>)}</ul>
    )
}
```

*Note **store** is a mutable source which is created outside React. The state is managed by a store not the 
React itself. It uses [useSubscription](https://www.npmjs.com/package/use-subscription) library to safely manage the subscription to the mutable 
source inside React Component.*

### Collocating stores
As much as possible group your stores through passing them to a single Container then collocate these 
stores near to the Components who consume them. Provide a scope to your shared state
via wrapping the React tree to the `StoresProvider`. Don't always think that shared state is always global.

### Slice your state
To make your app more success with restatum, always slice your state. "restatum" supports having a gigantic store state. 
But if you can put some values to their own store, do it. 

Some benefits of having multiple stores:
- The Component who consume the store state will only subscribe to that specific store not to all stores!. It 
means the subscription is only add to a single store.
- Because "restatum" supports the same interface of React hooks like `React.useState` and `React.useReducer`,
you can have a best choice what behaviuor you want to manage your state. Slicing your state could leverage
this feature.

### Typescript
"restatum" is written via Typescript. It has great support for type checking and documentation.

A tip for typescript-user when creating `Container`, in some cases you need to explicitly type the `initialState` and the 
`reducer` so that typescript can pick the correct type of the store's state. You can do this using the `const assertion`. 

```tsx
createContainer({
    todos: {
        initialState: [] as string[],
        reducer(state: string[], action: TodosAction) {
            return state
        },
    },
})

```


## API

### createContainer
<details>
  <summary>Expand parameters</summary>

  `createContainer(configuration: StoresConfiguration) => Container`
</details>


Creates a stores container. A `Container` holds the stores provided on the configuration/arguments. 
It takes an configuration object which defines the config of every stores. It returns `storeAccessors` 
and a `StoresProvider` that provides a scope for the access of the stores.

```jsx
const {StoresProvider, toggle} = createContainer({
    toggle: {
        initialState: true
    }
})
```

`toggle` property takes an object which has `initialState`. It can also accepts a `reducer` function. 
This object defines on how we want to manage the state.  If no `reducer` is provided, the behavior will be 
the same like `React.useState`.

`StoresProvider` holds the stores. Only the Components which are included to the tree can access the stores from Container. 
`StoresProvider` accepts an optional `initialStoresState`. If the prop is given, then the value passed will 
override the `initialState` from the `configuration` object. It accepts the same type of `initialState` or 
an `init` function which returns the `initialState`. This `init` is also invoked once, if the Components gets mounted.

```jsx
function App() {
    return (
        <AppContainer.StoresProvider
            initialStoresState={{
                toggle: true, // You can omit this property then restatum will use the `initialState` from configuration.
                todos: () => ['zion', 'irish', 'dennis'], // Behaves like lazy initialization.
            }}
        >
            {children}
        </AppContainer.StoresProvider>
    )
}
```

`toggle` property is a `StoreAccessor` object. Use this one if you want to access the store value or subcribe 
to the state chagne inside the Component, via passing this object as an argument to the hooks.

### useStoreState
<details>
  <summary>Expand parameters</summary>

  `useStoreState(storeAccessor: StoreAccessor) => [state, dispatch]`
</details>

A hook to access the store's state value and its associated dispatch. Component which uses the hook is automatically bound to the state.
It returns a tuple type for state and dispatch.

```jsx
import { useStoreState } from 'restatum'
import AppContainer from './AppContainer'

export const ToggleComponent = () => {
    const [toggle, setToggle] = useStoreState(AppContainer.toggle)
    return (
      <div>
        <span>Toggle is { toggle ? 'on' : 'off' }</span>
        <button onClick={() => setToggle(p => !p)}></button>
      </div>
    )
}
```

### useStoreValue
A hook to access the store's state value. Component which uses the hook is automatically 
bound to the state. Means, the Component will rerender  whenever there is state change.
It returns state value.
<details>
  <summary>Expand parameters</summary>

  `useStoreValue(storeAccessor: StoreAccessor) => state`
</details>

```jsx
import { useStoreValue } from 'restatum'
import AppContainer from './AppContainer'

export const ToggleComponent = () => {
    const toggle = useStoreValue(AppContainer.toggle)
    return <div>Toggle is { toggle ? 'on' : 'off' }</div>
}

```

### useStoreDispatch 
<details>
  <summary>Expand parameters</summary>

  `useStoreDispatch(storeAccessor: StoreAccessor) => dispatch`
</details>

A hook to access the store's dispatch. Component which uses the hook is not bound to the state.
Whenever there is a state change, the Component uses the hook will not rerender.

```jsx
import { useStoreState } from 'restatum'
import AppContainer from './AppContainer'

export const ToggleComponent = () => {
    const setToggle = useStoreDispatch(AppContainer.toggle)
    return (
      <button onClick={() => setToggle(p => !p)}></button>
    )
}

```

### useStoreSubscribe 
<details>
  <summary>Expand parameters</summary>

  `useStoreSubscribe(storeAccessor: StoreAccessor, cb: (nextState: S) => void) => void`
</details>

A hook to subscribe to a store's state. Whenever there is a state change, the passed
callback will execute but the Component will not rerender. It receives the latest state.


## License

MIT © [denniscual](https://github.com/denniscual)
