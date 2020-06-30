import { fork, ChildProcess } from 'child_process'
import * as fs from 'fs'
import * as Rx from 'rxjs'

import { MessageChannel, Message } from './MessageChannel'

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
    var child = fork(modulePath, args, options) as any

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
Task.create = function create(fn: Function) {
    var mainFn = fn
    var dataValues: { [key: string]: any } = {}

    var channel = MessageChannel(process)

    var sendToProcess = (type: string, payload: any) => channel.send(type, payload)

    var COM = {
        send: (data: any) => sendToProcess('DATA', data),
        message: msg => sendToProcess('MESSAGE', msg),
        resolve: data => sendToProcess('RESOLVE', data),
        reject: err => {
            var { name, message, stack } = err
            return sendToProcess('REJECT', {
                name, message, stack
            })
        }
    }

    process.on('message', (data: Message) => {
        switch (data.type) {
            case 'COMMAND': {
                if (data.payload === 'EXECUTE')
                    return execute()
                if (data.payload === 'TERMINATE')
                    return process.exit(0)
            }
            case 'SET': {
                dataValues[data.payload.key] = data.payload.value
                return
            }
        }
    })

    function execute() {
        return new Promise((resolve, reject) => {
            try {
                resolve(mainFn(dataValues))
            } catch (err) {
                reject(err)
            }
        }).catch(err => {
            COM.reject(err)
        })
    }

    return {
        get: (key: string) => key ? dataValues[key] : dataValues,
        main: (fn: Function) => mainFn = fn,
        send: COM.data,
        message: COM.message,
        resolve: COM.resolve,
        reject: COM.reject,
    }
}

module.exports = Task

function rebuildError(err: any) {
    var error = new Error()
    error.name = err.name
    error.message = err.message
    error.stack = err.stack
    return error
}