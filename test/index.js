var Task = require('../Task')

describe('async-task', function () {

    it('should create a task.', async () => {
        var task = Task.instantiate(__dirname + '/example-task.js')
        var result = await task.execute()
        return task.terminate()
    })

    it('should resolve to 42.', async () => {
        var task = Task.instantiate(__dirname + '/echo-task.js')
        task.set('result', 42)
        var result = await task.execute()
        if (result !== 42) throw new Error('Not42')
    })

})
