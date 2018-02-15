var expect = require('chai').expect
var path = require('path')

var Task = require('../Task')

describe('async-task', function () {

    it('should create a task.', async () => {
        var script = path.join(__dirname, '/example-task.js')
        var task = Task.instantiate(script)
        var result = await task.execute()
        return task.terminate()
    })

    it('should resolve to 42.', async () => {

        var script = path.join(__dirname, '/echo-task.js')
        var task = Task.instantiate(script)

        await task.set('result', 42)
        var result = await task.execute()

        expect(result).to.be.equal(42)

    })

    it.only('should execute multiple times.', async () => {

        var script = path.join(__dirname, '/echo-task.js')
        var task = Task.instantiate(script)

        await task.set('result', 442)
        var r1 = await task.execute()

        await task.set('result', 33)
        var r2 = await task.execute()

        task.terminate()

        expect(r1).to.be.equal(442)
        expect(r2).to.be.equal(33)

    })

    it('should fail because module does not exist.', async () => {

        var failed = false

        try {
            var task = await Task.createTaskManager(__dirname + '/idonotexist.js')
        } catch (err) {
            failed = true
        }

        expect(failed).to.be.true

    })

    after(() => {
        //process.exit()
    })

})
