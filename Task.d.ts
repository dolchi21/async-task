declare class TaskManager extends ChildProcess {
    execute(): Promise<any>
    set(key: string, value): Promise<any>
    terminate(): Promise<any>
}

declare class Task {
    get(key?: string): any
    main(fn: Function): this
    resolve(data: any): Promise<any>
}

export declare function create(fn?: Function): Task
export declare function instantiate(modulePath: string): TaskManager

