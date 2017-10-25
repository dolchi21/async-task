declare class TaskManager extends ChildProcess {
    execute(): Promise<any>
    set(key: string, value): Promise<any>
    terminate(): Promise<any>
}

declare class Task {
    disconnect(): any
    get(key?: string): any
    main(fn: Function): this
    resolve(data: any): Promise<any>
    reject(err: Error): Promise<any>
}

export declare function create(fn?: Function): Task
export declare function createTaskManager(modulePath: string, args?: string[], options?: object): Promise<TaskManager>
export declare function instantiate(modulePath: string, args?: string[], options?: object): TaskManager
