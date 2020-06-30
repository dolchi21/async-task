var Task = require('../Task')

var T = Task.create()

T.main(async function () {
    await T.resolve('hello')
    T.disconnect()
})
