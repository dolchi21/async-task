var { fork } = require('child_process')

function Task(fn) {
    return Task.create(fn)
}
Task.instantiate = function instantiate(modulePath, args, options) {
    var child = fork(modulePath, args, options)

    //child.on('error', err => console.error(child.pid, err))
    //child.on('exit', (code, signal) => console.log(child.pid, 'exited', code, signal))

    var send = (type, payload) => sendToProcess(child, type, payload)
    var command = cmd => send('COMMAND', cmd)

    child.execute = async () => {
        await command('EXECUTE')
        return child.onResponse
    }
    child.set = async function set(key, value) {
        return await send('SET', {
            key, value
        })
    }
    child.terminate = async () => {
        return await command('TERMINATE')
    }
    child.onResponse = (() => {
        return new Promise((resolve, reject) => {
            function resolveOnReturn(msg) {
                if (msg.type !== 'RESOLVE') return
                child.response = msg.payload
                resolve(msg.payload)
            }
            child.on('message', resolveOnReturn)
        })
    })()

    return child
}
Task.create = function create(fn) {
    var mainFn = fn
    var dataValues = {}

    function handleCommand(action) {
        var { type, payload } = action
        if (payload === 'EXECUTE') return mainFn && mainFn()
        if (payload === 'TERMINATE') return process.exit(0)
    }
    function onMessage(action) {
        var { type, payload } = action
        switch (type) {
            case 'COMMAND': {
                return handleCommand(action)
            }
            case 'SET': {
                dataValues[payload.key] = payload.value
                return
            }
        }
    }
    process.on('message', onMessage)
    return {
        get: key => key ? dataValues[key] : dataValues,
        main: fn => mainFn = fn,
        message: msg => sendToProcess(process, 'MESSAGE', msg),
        resolve: data => {
            return sendToProcess(process, 'RESOLVE', data)
        },
        disconnect() {
            process.removeListener('message', onMessage)
        }
    }
}

function sendToProcess(process, type, payload) {
    return new Promise((resolve, reject) => {
        process.send({
            type,
            payload
        }, err => err ? reject(err) : resolve())
    })
}

module.exports = Task
