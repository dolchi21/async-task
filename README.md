# async-task
Execute node modules as child processes (child_process.fork wrapper).

```js
// parent.js
var Task = require('async-task')
var task = Task.instantiate('./task.js')
await task.set('customData', 'a simple string or anything')
await task.set('document', {
    name: 'example.pdf'
})
var result = await task.execute()
```

```js
// task.js
var Task = require('async-task')
var T = Task.create()
T.main(function onExecuteCall() {
    var customData = T.get('customData') // 'a simple string or anything'
    var doc = T.get('document') // { name: 'example.pdf' }
    var result = cpuIntensiveTask()
    T.resolve(result)
})
```

## API

Sets the current script as a Task.

#### Task.create()

```js
var T = Task.create()
```

Sets the function to be executed.
#### T.main(fn: Function)

```js
var T = Task.create()
T.main(async function doThis() {
    /* ... */
})
```

Get custom data setted from parent process.
#### T.get()

```js
var T = Task.create()
T.main(async function doThis() {
    var data = T.get('customData')
    /* ... */
})
```

Communicates the result to the parent process.

#### T.resolve()

```js
var T = Task.create()
T.main(async function getUsers() {
    /* ... */
    T.resolve(users)
})
```
