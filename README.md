# async-task
Execute node modules as child processes (child_process.fork wrapper).

```js
// parent.js
var Task = require('async-task')
var task = Task.instantiate('./task.js')
var result = await task.execute()
```

```js
// task.js
var Task = require('async-task')
var T = Task.create()
T.main(function main(){
    var result = cpuIntensiveTask()
    T.resolve(result)
})
```