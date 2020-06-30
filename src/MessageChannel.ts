import { fork, ChildProcess } from 'child_process'
//const uuid = require('uuid')
import * as uuid from 'uuid'

export interface Message {
    id: string
    type: string
    payload?: any
}

type Process = ChildProcess | NodeJS.Process

export function MessageChannel(process: Process) {
    const confirmationCallbacks: { [key: string]: any } = {}

    function send(type: string, payload: any) {
        const messageId = uuid.v4()
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

    function onMessage(data: Message) {
        switch (data.type) {
            case 'CONFIRM': {
                if (confirmationCallbacks[data.payload]) {
                    confirmationCallbacks[data.payload]()
                    delete confirmationCallbacks[data.payload]
                }
                return
            }
            default: {
                if (data.id) send('CONFIRM', data.id)
            }
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