# restatum

[![NPM](https://img.shields.io/npm/v/restatum.svg)](https://www.npmjs.com/package/restatum) [![Build Status](https://travis-ci.org/denniscual/restatum.svg?branch=master)](https://travis-ci.org/denniscual/restatum)

Managing your application state must be easy and straightforward. **restatum** is a minimal and fast library 
which provides you these features in Reactish way. It uses same and well-known approach like [React.useState](https://reactjs.org/docs/hooks-reference.html#usestate) and [React.useReducer](https://reactjs.org/docs/hooks-reference.html#usereducer) for handling your state, so integrating it into your app is a breeze! [Sample in Codesandbox](https://codesandbox.io/s/serene-rgb-ok6qd?file=/src/App.js).

```bash
npm install --save restatum
or
yarn add restatum
```

### First, create a store
```tsx
import { createStore } from 'restatum'

const appStore = createStore({
    count: {
        initialState: 0,
    },
})
```

### Wrap your React tree
```jsx
import appStore from './appStore'

function App() {
    return (
        <appStore.StoreProvider>
            <Counter />
        </appStore.StoreProvider>
    )
}
```

### Lastly, bind your Components!
```jsx
import { useStoreState } from 'restatum'
import appStore from './appStore'

function Counter() {
    const [count, setCount] = useStoreState(appStore.count)
    return (
        <div>
            <span>Count: {count}</span>
            <button onClick={() => setCount((p) => ++p)}>Increment Counter</button>
        </div>
    )
}
```

## Recipes

### Reducer sample
Above, we used `React.useState` approach. This is the simple form of managing your state with restatum. 
If you want to manage your state just like `React.useReducer`, then pass a `reducer` method to a store 
configuration.

```jsx
const appStore = createStore({
    todos: {
        initialState: []
        reducer(state, action) {
            // return the new state
            return state
        }
    }
})

function Todos() {
    const [todos, dispatch] = useStoreState(appStore.todos)

    return (
        <ul>{todos.map(todo => <li key={todo}>{todo}</li>)}</ul>
    )
}
```

### Typescript
**restatum** is written via Typescript. It has great support for type checking and documentation.

A tip for typescript-user when creating `Store`, in some cases you need to explicitly type the `initialState` and the 
`reducer` so that typescript can pick the correct type of the store's state. You can do this using the [const assertion](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html#const-assertions). 

```tsx
createStore({
    todos: {
        initialState: [] as string[],
        reducer(state: string[], action: TodosAction) {
            return state
        },
    },
})

```

[Check this sample in Codesandbox written in TS](https://codesandbox.io/s/vigilant-solomon-n4uvr?file=/src/App.tsx).

## Things to consider

Before using **restatum**, ask yourself first if you really need it. Start with local state,
then hoist to the top. And then if the props drilling and managing these state start to 
get messy, then go to **restatum**. This is your last resort! Note that its good to collocate your store.
It means that put your store near to the tree, with `Context.Provider`, who consume it. And its also good practice to have 
different stores for managing their particular feature.

I would also suggest to not use **restatum** for managing your server state. There are lots 
of great libraries out there which has great features like caching, deduping request, etc
for your server state. 

Some resources:
- [react-query](https://github.com/tannerlinsley/react-query)
- [swr](https://github.com/vercel/swr)

And for complex UI prototyping software, check [redux](https://github.com/reduxjs/react-redux) and [recoil](https://github.com/facebookexperimental/Recoil).

## API

### createStore
<details>
  <summary>Expand parameters</summary>

  `createStore(configuration: StoreConfiguration) => Container`
</details>


A `Store` holds the state provided on the configuration/arguments. 
It takes configuration object which defines the config of every state. It returns `stateAccessors` 
and a `StoreProvider` that provides a scope for the access of the store.

```jsx
const appStore = createStore({
    toggle: {
        initialState: true
    }
})
```

toggle - property takes an object which has `initialState`. It can also accepts a `reducer` function. 
This object defines on how you want to manage the state.  If no `reducer` is provided, the behavior will be 
the same like `React.useState`.

appStore.StoreProvider - holds the store. Only the Components which are included to the tree can access the store. 
`StoreProvider` accepts an optional `initialStoreState`. If the prop is given, then the value passed will 
override the `initialState` from the `configuration` object. It accepts the same type of `initialState` or 
an `init` function which returns the `initialState`. This `init` is also invoked once, if the Components gets mounted.

```jsx
function App() {
    return (
        <appStore.StoreProvider
            initialStoreState={{
                toggle: true, // You can omit this property then restatum will use the `initialState` from configuration.
                todos: () => ['zion', 'irish', 'dennis'], // Behaves like lazy initialization.
            }}
        >
            {children}
        </appStore.StoreProvider>
    )
}
```

appStore.toggle - property is a `StateAccessor` object. Use this one if you want to access the store state or subcribe 
to the state change inside the Component, via passing this object as an argument to the hooks.

### useStoreState
<details>
  <summary>Expand parameters</summary>

  `useStoreState(stateAccessor: StateAccessor) => [state, dispatch]`
</details>

A hook to access the store state value and its associated dispatch. Component which uses the hook is automatically bound to the state.
It returns a tuple type for state and dispatch.

```jsx
import { useStoreState } from 'restatum'
import appStore from './appStore'

export const ToggleComponent = () => {
    const [toggle, setToggle] = useStoreState(appStore.toggle)
    return (
      <div>
        <span>Toggle is { toggle ? 'on' : 'off' }</span>
        <button onClick={() => setToggle(p => !p)}></button>
      </div>
    )
}
```

### useValue
A hook to access the store state value. Component which uses the hook is automatically 
bound to the state. Means, the Component will rerender  whenever there is state change.
It returns state value.
<details>
  <summary>Expand parameters</summary>

  `useValue(stateAccessor: StateAccessor) => state`
</details>

```jsx
import { useValue } from 'restatum'
import appStore from './appStore'

export const ToggleComponent = () => {
    const toggle = useValue(appStore.toggle)
    return <div>Toggle is { toggle ? 'on' : 'off' }</div>
}

```

### useDispatch 
<details>
  <summary>Expand parameters</summary>

  `useDispatch(stateAccessor: StateAccessor) => dispatch`
</details>

A hook to access the store state dispatch. Component which uses the hook is not bound to the state.
Whenever there is a state change, the Component uses the hook will not rerender.

```jsx
import { useDispatch } from 'restatum'
import appStore from './appStore'

export const ToggleComponent = () => {
    const setToggle = useDispatch(appStore.toggle)
    return (
      <button onClick={() => setToggle(p => !p)}></button>
    )
}

```

### useSubscribe 
<details>
  <summary>Expand parameters</summary>

  `useSubscribe(stateAccessor: StateAccessor, cb: (nextState: S) => void) => void`
</details>

A hook to subscribe to a store state. Whenever there is a state change, the passed
callback will execute but the Component will not rerender. It receives the latest state.


```jsx
import { useSubscribe } from 'restatum'
import appStore from './appStore'
 
export const ToggleComponent = () => {
  useSubscribe(appStore.toggle, state => console.log('current state', state))
  return (
    <div>Hey! This is a Toggle Component</div>
  )
}
```


## License

MIT © [denniscual](https://opensource.org/licenses/MIT)
