var { fork } = require('child_process')
var fs = require('fs')
var Rx = require('rxjs')

function Task(fn) {
    return Task.create(fn)
}
Task.createTaskManager = function createTaskManager(modulePath, args, options) {
    return new Promise((resolve, reject) => {
        fs.access(modulePath, err => {
            if (err) return reject(err)
            var task = Task.instantiate(modulePath, args, options)
            resolve(task)
        })
    })
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
                switch (msg.type) {
                    case 'RESOLVE': {
                        child.response = msg.payload
                        return resolve(msg.payload)
                    }
                    case 'REJECT': {
                        return reject(rebuildError(msg.payload))
                    }
                    default: return
                }
            }
            child.on('message', resolveOnReturn)
        })
    })()

    return child
}
Task.create = function create(fn) {
    var mainFn = fn
    var dataValues = {}

    var onMessage = Rx.Observable.fromEvent(process, 'message')
    var onCommand = onMessage.filter(action => action.type === 'COMMAND')
    var onSet = onMessage.filter(action => action.type === 'SET').map(action => action.payload)

    var disconnect = (function makeSubs() {
        var subs = [
            onCommand.subscribe(action => {
                handleCommand(action)
            }),
            onSet.subscribe(data => {
                dataValues[data.key] = data.value
            })
        ]
        return () => subs.map(sub => sub.unsubscribe())
    })()

    function execute() {
        return new Promise((resolve, reject) => {
            try {
                resolve(mainFn())
            } catch (err) {
                reject(err)
            }
        }).catch(err => {
            console.error('mainFn()', 'error')
            disconnect()
            reject(err)
        })
    }
    function resolve(data) {
        return sendToProcess(process, 'RESOLVE', data)
    }
    function reject(err) {
        var { name, message, stack } = err
        return sendToProcess(process, 'REJECT', {
            name, message, stack
        })
    }

    function handleCommand(action) {
        var { type, payload } = action
        if (payload === 'EXECUTE') return execute()
        if (payload === 'TERMINATE') return process.exit(0)
    }

    return {
        get: key => key ? dataValues[key] : dataValues,
        main: fn => mainFn = fn,
        message: msg => sendToProcess(process, 'MESSAGE', msg),
        resolve,
        reject,
        disconnect
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

function rebuildError(err) {
    var error = new Error()
    error.name = err.name
    error.message = err.message
    error.stack = err.stack
    return error
}