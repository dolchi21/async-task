var Task = require('../Task')

var T = Task.create()

function fibonacci(num) {
    if (num <= 1) return 1
    return fibonacci(num - 1) + fibonacci(num - 2)
}

T.main(async function () {

    var number = T.get('number')

    var result = fibonacci(number)

    await T.resolve(result)

    T.disconnect()

})
