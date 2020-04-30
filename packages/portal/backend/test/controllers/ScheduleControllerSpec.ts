import {expect} from "chai";
import "mocha";

import {register} from "ts-node"; // load first
import {Test} from "../../../../common/TestHarness";
import {ScheduleController} from "../../src/controllers/ScheduleController";
import '../GlobalSpec';

describe("ScheduleController", () => {
    let sc: ScheduleController = null;
    const taskName: string = "sampleTask";

    before( async () => {
        await Test.suiteBefore('ScheduleController');
    });

    beforeEach(() => {
        sc = ScheduleController.getInstance();
    });

    after(async () => {
        Test.suiteAfter('ScheduleController');
    });

    it(`Invoking getInstance should return the same object.`, () => {
        expect(sc).to.be.equal(ScheduleController.getInstance());
    });

    it(`Should not be able to register a task that was in the past.`, async () => {
        const currentTime = new Date();
        const previousTime = new Date(currentTime);
        previousTime.setHours(previousTime.getHours() - 2);

        expect(previousTime < currentTime).to.be.true;

        // attempt to schedule a task
        const testClosure = buildTestClosure();

        const registerResult = sc.registerTask(taskName, previousTime, testClosure.increment);

        expect(registerResult).to.be.false;
        await new Promise((resolve) => setTimeout(resolve, 1000)); // sleep for 1 second
        expect(testClosure.getInvokeCount()).to.be.eq(0);
    });

    it(`Should be possible to register a task 2 seconds in the future, and have it run.`, async () => {
        const testClosure = buildTestClosure();
        const futureTime = new Date();
        futureTime.setSeconds(futureTime.getSeconds() + 2);

        const registerResult = sc.registerTask(taskName, futureTime, testClosure.increment);
        expect(registerResult).to.be.true;

        await new Promise((resolve) => setTimeout(resolve, 5000)); // sleep for 5 seconds
        expect(testClosure.getInvokeCount()).to.eq(1);
    });

    it(`Should be possible to schedule a task 1 hour in the future, and now have it run immediately.`, async ()  => {
        const testClosure = buildTestClosure();

        const futureTime = new Date();
        futureTime.setHours(futureTime.getHours() + 1);

        const registerResult = sc.registerTask(taskName, futureTime, testClosure.increment);
        expect(registerResult).to.be.true;

        expect(testClosure.getInvokeCount()).to.eq(0);
        await new Promise((resolve) => setTimeout(resolve, 1000)); // sleep for 1 seconds
        expect(testClosure.getInvokeCount()).to.eq(0);
    });

    it(`Should not be possible to schedule more than one task with the same name`, async () => {
        const testClosure = buildTestClosure();

        const firstFutureTime = new Date();
        firstFutureTime.setHours(firstFutureTime.getHours() + 1);

        const firstRegisterResult = sc.registerTask(taskName, firstFutureTime, testClosure.increment);
        expect(firstRegisterResult).to.be.true;

        const secondFutureTime = new Date();
        secondFutureTime.setHours(firstFutureTime.getHours() + 2);

        const secondRegisterResult = sc.registerTask(taskName, secondFutureTime, testClosure.increment);
        expect(secondRegisterResult).to.be.false;
    });

    it(`Should be possible to schedule multiple tasks with different names`, async () => {
        const testClosure = buildTestClosure();

        const firstFutureTime = new Date();
        firstFutureTime.setHours(firstFutureTime.getHours() + 1);

        const firstRegisterResult = sc.registerTask(taskName, firstFutureTime, testClosure.increment);
        expect(firstRegisterResult).to.be.true;

        const secondTaskName = taskName + "-new";
        const secondFutureTime = new Date();
        secondFutureTime.setHours(firstFutureTime.getHours() + 2);

        const secondRegisterResult = sc.registerTask(secondTaskName, secondFutureTime, testClosure.increment);
        expect(secondRegisterResult).to.be.true;
    });

    it(`Should be possible to cancel a task that is scheduled`, async () => {
        const testClosure = buildTestClosure();

        const futureTime = new Date();
        futureTime.setHours(futureTime.getHours() + 1);

        const registerResult = sc.registerTask(taskName, futureTime, testClosure.increment);
        expect(registerResult).to.be.true;

        expect(testClosure.getInvokeCount()).to.eq(0);

        const cancelResult = sc.cancelTask(taskName);

        expect(cancelResult).to.be.true;
        expect(testClosure.getInvokeCount()).to.be.eq(0);
    });

    it(`Should be possible to retrieve the status of a task that does not exist.`, async () => {
        const taskStatus = sc.getTaskStatus(taskName);

        expect(taskStatus.exists).to.be.false;
    });

    it(`Should be possible to retrieve the status of a task that has not completed.`, async () => {
        const testClosure = buildTestClosure();

        const futureTime = new Date();
        futureTime.setHours(futureTime.getHours() + 1);

        const registerResult = sc.registerTask(taskName, futureTime, testClosure.increment);
        expect(registerResult).to.be.true;

        expect(testClosure.getInvokeCount()).to.eq(0);
        const taskStatus = sc.getTaskStatus(taskName);

        expect(taskStatus.exists).to.be.true;
        expect(taskStatus.complete).to.be.false;
    });

    it(`Should be possible to retrieve the status of a task that has completed.`, async () => {
        const testClosure = buildTestClosure();

        const futureTime = new Date();
        futureTime.setHours(futureTime.getSeconds() + 2);

        const registerResult = sc.registerTask(taskName, futureTime, testClosure.increment);
        expect(registerResult).to.be.true;
        expect(testClosure.getInvokeCount()).to.eq(0);

        await new Promise((resolve) => setTimeout(resolve, 3000));
        expect(testClosure.getInvokeCount()).to.eq(1);

        const taskStatus = sc.getTaskStatus(taskName);

        expect(taskStatus.exists).to.be.true;
        expect(taskStatus.complete).to.be.true;
    });

    it(`Should be able to retrieve all tasks in the scheduler.`, async () => {
        const testClosure = buildTestClosure();

        const firstFutureTime = new Date();
        firstFutureTime.setHours(firstFutureTime.getHours() + 1);
        sc.registerTask(taskName, firstFutureTime, testClosure.increment);

        let taskSet = sc.getAllTasks();
        expect(taskSet.size).to.eq(1);

        const secondTaskName = taskName + "-new";
        const secondFutureTime = new Date();
        secondFutureTime.setHours(firstFutureTime.getHours() + 2);
        sc.registerTask(secondTaskName, secondFutureTime, testClosure.increment);

        taskSet = sc.getAllTasks();
        expect(taskSet.size).to.eq(2);
    });

    function buildTestClosure() {
        let invokeCount: number = 0;

        return {
            increment: () => {
                invokeCount += 1;
            },

            getInvokeCount: () => {
                return invokeCount;
            },
        };
    }
});
