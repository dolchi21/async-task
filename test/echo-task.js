var Task = require('../Task')

var T = Task.create()

T.main(async function () {
    var result = T.get('result')
    await T.resolve(result)
    T.disconnect()
})
