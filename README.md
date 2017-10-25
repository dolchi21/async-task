# async-task
Execute node modules as child processes (child_process.fork wrapper).

```js
// parent.js
var Task = require('async-task')
var task = await Task.createTaskManager('./task.js')
await task.set('customData', 'a simple string')
await task.set('document', {
    id: 123,
    name: 'example.pdf'
})
var result = await task.execute()
```

```js
// task.js
var Task = require('async-task')
var T = Task.create()
T.main(function onExecuteCall() {
    var customData = T.get('customData') // 'a simple string'
    var doc = T.get('document') // { id: 123, name: 'example.pdf' }
    var result = cpuIntensiveTask()
    T.resolve(result)
})
```

## TaskManager API

Creates a task manager.

#### Task.createTaskManager(modulePath, [args, [options]]): TaskManager

```js
var task = await Task.createTaskManager('./example-task.js')
```

Tells forked process to execute main function and returns a promise with the result.

#### taskManager.execute()

```js
var task = await Task.createTaskManager('./example-task.js')
var result = await task.execute()
```

Sets custom data inside the forked process.

#### taskManager.set(key: string, value: any)

```js
var task = await Task.createTaskManager('./example-task.js')
task.set('input', 42)
```

## Task API

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

## TODO

- Error handling.
- taskManager.execute() should reject if forked process sends error