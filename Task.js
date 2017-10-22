var { fork } = require('child_process')

function Task() {
    return Task.create()
}
Task.instantiate = function instantiate(modulePath) {
    var child = fork(modulePath, ['--inspect'])

    child.on('exit', (code, signal) => console.log(child.pid, 'exited', code, signal))

    var send = (type, payload) => sendToProcess(child, type, payload)
    var command = cmd => send('COMMAND', cmd)

    child.execute = async () => {
        await command('EXECUTE')
        return child.onResponse
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
    process.on('message', message => {
        if (message.type !== 'COMMAND') return
        if (message.payload !== 'EXECUTE') return
        mainFn && mainFn()
    })
    return {
        main: fn => {
            mainFn = fn
        },
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
