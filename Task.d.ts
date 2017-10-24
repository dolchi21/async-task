import *  as ChildProcess from 'child_process'

declare class TaskInstance extends ChildProcess {
    async execute(): Promise<any>
    async terminate(): Promise<any>
    
}

declare interface TaskGenerator {
    create(): Task
    instantiate(modulePath: string): TaskInstance
}

export declare function instantiate(modulePath: string): TaskInstance

