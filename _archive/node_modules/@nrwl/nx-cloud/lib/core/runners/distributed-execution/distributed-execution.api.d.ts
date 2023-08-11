import { CloudTaskRunnerOptions } from '../../models/cloud-task-runner-options';
import { Task } from '../../models/run-context.model';
export declare class DistributedExecutionApi {
    private apiAxiosInstance;
    constructor(options: CloudTaskRunnerOptions);
    start(params: any): Promise<string>;
    status(id: string): Promise<any>;
    completeRunGroupWithError(runGroup: string, error: string): Promise<void>;
}
export declare function createStartRequest(runGroup: string, task: Task[][], options: CloudTaskRunnerOptions): any;
