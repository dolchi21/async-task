var { fork } = require('child_process')

function Task() {
    return Task.create()
}
Task.instantiate = function instantiate(modulePath) {
    var child = fork(modulePath, ['--inspect'])

    child.on('error', err => console.error(child.pid, err))
    child.on('exit', (code, signal) => console.log(child.pid, 'exited', code, signal))

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
Task.create = function create() {
    var mainFn;
    var dataValues = {}

    function handleCommand(action) {
        var { type, payload } = action
        if (payload === 'EXECUTE') return mainFn && mainFn()
        if (payload === 'TERMINATE') return process.exit(0)
    }

    process.on('message', action => {
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
    })
    return {
        get: key => key ? dataValues[key] : dataValues,
        main: fn => {
            mainFn = fn
        },
        message: msg => sendToProcess(process, 'MESSAGE', msg),
        resolve: data => {
            return sendToProcess(process, 'RESOLVE', data)
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
