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