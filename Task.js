var { fork } = require('child_process')
var fs = require('fs')
var Rx = require('rxjs')
var uuid = require('uuid')

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

    var channel = MessageChannel(child)
    var sendToProcess = channel.send

    var onMessage = Rx.Observable.fromEvent(child, 'message')
    child.onData = onMessage.filter(({ type }) => type === 'DATA').map(({ payload }) => payload)

    var send = (type, payload) => sendToProcess(type, payload)
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
            var onResult = onMessage.filter(({ type }) => {
                return (type === 'RESOLVE') || (type === 'REJECT')
            }).first()
            onResult.subscribe(({ type, payload }) => {
                if (type === 'RESOLVE') return resolve(payload)
                if (type === 'REJECT') return reject(rebuildError(payload))
            })
        })
    })()

    return child
}
Task.create = function create(fn) {
    var mainFn = fn
    var dataValues = {}

    var channel = MessageChannel(process)

    var sendToProcess = (type, payload) => channel.send(type, payload)

    var COM = {
        send: data => sendToProcess('DATA', data),
        message: msg => sendToProcess('MESSAGE', msg),
        resolve: data => sendToProcess('RESOLVE', data),
        reject: err => {
            var { name, message, stack } = err
            return sendToProcess('REJECT', {
                name, message, stack
            })
        }
    }

    var onMessage = Rx.Observable.fromEvent(process, 'message')
    var onCommand = onMessage.filter(({ type }) => type === 'COMMAND').map(({ payload }) => payload)
    var onSet = onMessage.filter(({ type }) => type === 'SET').map(({ payload }) => payload)

    var disconnect = (function makeSubs() {
        var subs = [
            onCommand.subscribe(cmd => {
                switch (cmd) {
                    case 'EXECUTE':
                        return execute()
                    case 'TERMINATE':
                        return process.exit(0)
                }
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
            disconnect()
            COM.reject(err)
        })
    }

    return {
        get: key => key ? dataValues[key] : dataValues,
        main: fn => mainFn = fn,
        send: COM.data,
        message: COM.message,
        resolve: COM.resolve,
        reject: COM.reject,
        disconnect
    }
}

function MessageChannel(process) {
    var confirmationCallbacks = {}

    function send(type, payload) {
        var messageId = uuid.v4()
        return new Promise((resolve, reject) => {
            confirmationCallbacks[messageId] = resolve
            process.send({
                id: messageId,
                type,
                payload
            }, err => {
                if (!err) return
                delete confirmationCallbacks[messageId]
                reject(err)
            })
        })
    }

    function onMessage(data) {
        if (data.type === 'CONFIRM') {
            if (confirmationCallbacks[data.payload]) {
                confirmationCallbacks[data.payload]()
                delete confirmationCallbacks[data.payload]
            }
        }
        if (data.type !== 'CONFIRM' && data.id) {
            send('CONFIRM', data.id)
        }
    }

    process.on('message', onMessage)

    return {
        send,
        close() {
            process.removeListener('message', onMessage)
        }
    }
}

module.exports = Task

function rebuildError(err) {
    var error = new Error()
    error.name = err.name
    error.message = err.message
    error.stack = err.stack
    return error
}