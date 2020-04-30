import * as schedule from "node-schedule";
import Log from "../../../../common/Log";

export interface Task {
    time: Date;
    taskName: string;
    scheduledTask: (argObject: any) => any;
    data: any;
    job: schedule.Job;
    complete: boolean;
}

/**
 * This class managers Scheduled tasks for Classy
 */
export class ScheduleController {
    private taskList: Map<string, Task>;
    private static instance: ScheduleController = null;

    private constructor() {
        Log.info(`ScheduleController::constructor() - start`);
    }

    public static getInstance(): ScheduleController {
        Log.info(`ScheduleController::getInstance() - start`);

        if (this.instance === null) {
            Log.info(`ScheduleController::getInstance() - no previous instance, initializing`);
            this.instance = new ScheduleController();
        }

        return this.instance;
    }

    public verifyTasks(): boolean {
        Log.info(`ScheduleController::verifyTasks() - start`);
        Log.warn(`ScheduleController::verifyTasks() - Not implemented`);
        return true;
    }

    // public scheduleTask(newTask: Task): boolean {
    //     Log.info(`ScheduleController::scheduleTask( ${JSON.stringify(newTask)} ) - start`);
    //     // TODO: Implement this
    // }

    /**
     * Registers a given function with the given name to execute at the given date/time
     * @param taskName unique name for task
     * @param taskDate date/time to execute task, will not schedule if Date is in the past
     * @param taskFunction function to execute
     * @param data optional data object to pass to the function
     * @returns boolean true if task was successfully added
     */
    public registerTask(taskName: string, taskDate: Date, taskFunction: (arg: any) => any, data?: any): boolean {
        Log.info(`ScheduleController::registerTask( ${taskName}, ${taskDate.toISOString()}, ${taskFunction.name} ) - start`);

        const currentDate: Date = new Date();
        if (currentDate >= taskDate) {
            // current date is past the taskDate, do not schedule it
            Log.info(`ScheduleController::registerTask(..) - taskDate: ${taskDate.toISOString()} has already passed`);
            return false;
        }

        // check if a task already exists with given name
        if (this.taskList.get(taskName) !== null) {
            Log.info(`ScheduleController::registerTask(..) - taskName: ${taskName} already has a mapping`);
            return false;
        }

        // schedule the task
        Log.info(`ScheduleController::registerTask(..) - scheduling task`);
        const scheduledJob: schedule.Job = schedule.scheduleJob(taskDate, () => {
            Log.info(`ScheduleController::registerTask(..)::scheduleJob( ${JSON.stringify(data)} ) - scheduling task`);
            const functionReturn = taskFunction(data);
            this.taskList.get(taskName).complete = true;
            return functionReturn;
        });

        // construct the task mapping
        const newTask: Task = {
            taskName: taskName,
            time: taskDate,
            scheduledTask: taskFunction,
            data: data,
            job: scheduledJob,
            complete: false,
        };

        this.taskList.set(taskName, newTask);

        return true;
    }

    /**
     * Get's the status of the taskName given
     * @param taskName
     * @returns object that contains if the task exists, and if it's completed
     */
    public getTaskStatus(taskName: string): { exists: boolean, complete: boolean } {
        Log.info(`ScheduleController::getTaskStatus( ${taskName} ) - start`);

        const task = this.taskList.get(taskName);

        if (task === null) {
            return {
                exists: false,
                complete: false
            };
        }

        return {
            exists: true,
            complete: task.complete
        };
    }

    /**
     *
     * @param taskName
     * @returns success in cancelling the task
     */
    public cancelTask(taskName: string): boolean {
        Log.info(`ScheduleController::cancelTask( ${taskName} ) - start`);
        const task = this.taskList.get(taskName);

        if (task === null) {
            return false;
        }

        return schedule.cancelJob(task.job);
    }

    public getAllTasks(): Set<Task> {
        const taskSet = new Set<Task>();

        for (const task of this.taskList.values()) {
            taskSet.add(task);
        }

        return taskSet;
    }

}
