import * as restify from "restify";
import {AutoTest} from "./autotest/AutoTest";
import {DummyClassPortal} from "./autotest/ClassPortal";
import {DummyDataStore} from "./autotest/DataStore";
import {DummyGithubService} from "./autotest/GithubService";
// import CommitCommentController from "../controller/github/CommitCommentController";
// import PushController from "../controller/github/PushController";
// import ResultController from '../controller/ResultController';
// import RequestHelper from "../../src/rest/helpers/RequestHelper";
import Log from "./Log";
import {ICommentEvent, IPushEvent} from "./Types";
import {GithubUtil} from "./util/GithubUtil";

// import {TestJob} from '../controller/TestJobController';
// import ResultRecordController from '../controller/ResultRecordController';
// import StaticHtmlController from '../controller/StaticHtmlController';
// import ResultRecord, {ResultPayload} from '../model/results/ResultRecord';

export default class RouteHandler {

    public static autoTest: AutoTest = null;

    public static getAutoTest(): AutoTest {
        if (RouteHandler.autoTest === null) {

            // TODO: create these in server?
            const data = new DummyDataStore();
            const portal = new DummyClassPortal();
            const gh = new DummyGithubService();
            const courseId = "cs310";

            RouteHandler.autoTest = new AutoTest(courseId, data, portal, gh);
        }
        return RouteHandler.autoTest;
    }

    /**
     *  Get the number of jobs currently waiting or paused in the queue.
     */

    /*
    public static queueStats(req: restify.Request, res: restify.Response, next: restify.Next) {
      Log.info('RouteHandler::queueStats() - <RCV> Queue stats.');
      try {
        let serverPort: number = RequestHelper.parseServerPort(req);
        let currentCourseNum = RequestHelper.parseCourseNum(serverPort);
        let controller: TestJobController = TestJobController.getInstance(currentCourseNum);
        controller.getStats().then(stats => {
          let lenExpQueue: number = stats[1].waiting + stats[1].paused;
          Log.info('RouteHandler::queueStats() - <200> Number of waiting or paused express jobs: ' + lenExpQueue + '.');
          res.json(200, {body: stats});
        }).catch(err => {
          Log.error('RouteHandler::queueStats() - <400> ERROR getting stats: ' + err);
          res.json(400, {error: err});
        });
      } catch(err) {
        Log.error('RouteHandler::queueStats() - <400> ERROR getting stats: ' + err);
        res.json(400, {error: err});
      }
      return next();
    }
  */

    /**
     * Handles GitHub POSTs, currently:
     *  - commit_comment
     *  - push
     */
    public static postGithubHook(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.info("RoutHandler::postGithubHook(..) - start");
        const githubEvent: string = req.header("X-GitHub-Event");
        const body = req.body;
        let team: string = "";
        const serverPort = RouteHandler.parseServerPort(req);
        const currentCourseNum = RouteHandler.parseCourseNum(serverPort);

        try {
            const name: string = body.repository.name;
            team = name.substring(name.indexOf("_") + 1);
        } catch (err) {
            Log.error("RoutHandler::postGithubHook(..) - ERROR extracting repo name: " + err);
        }
        Log.info("RouteHandler::postGithubHook() - <RVD> [" + team + "] X-GitHub-Event " + githubEvent + ".");

        // enumerate GitHub event
        switch (githubEvent) {
            case "ping":
                // req;
                Log.info("RouteHandler::postGithubHook() - <200> [" + team + "] pong.");
                res.json(200, "pong");
                break;

            case "commit_comment":
                try {
                    // const controller: CommitCommentController = new CommitCommentController(currentCourseNum);
                    // use body
                    const payload: any = body; // JSON.parse(JSON.stringify(body));
                    const commitId = payload.comment.commit_id;
                    let commitUrl = payload.comment.html_url;  // this is the comment Url
                    commitUrl = commitUrl.substr(0, commitUrl.lastIndexOf("#")); // strip off the comment reference
                    const projectUrl = payload.html_url;
                    const repoName = payload.repository.name;
                    // that.deliverable = GithubUtil.parseDeliverable(payload.repository.name);
                    team = GithubUtil.getTeamOrProject(repoName);
                    const requestor = String(payload.comment.user.login).toLowerCase();
                    // that.user = String(payload.comment.user.login).toLowerCase();
                    const orgName = payload.organization.login;
                    // const commitCommentUrl = payload.comment.html_url;
                    // that.repo = payload.repository.name;
                    // const hook = Url.parse(payload.repository.commits_url.replace("{/sha}", "/" + this.commit) + "/comments");
                    const message = payload.comment.body;
                    const delivId = GithubUtil.parseDeliverableFromComment(message);

                    // that.isRequest = payload.comment.body.toLowerCase().includes(this.config.getMentionTag());
                    // that.isProcessed = true;

                    // TODO: check all of these
                    const commentEvent: ICommentEvent = {
                        // branch:     branch,
                        repo:      repoName,
                        commit:    commitId,
                        commitUrl,
                        projectUrl,
                        userName:  requestor,
                        courseId:  null, // not yet known
                        delivId,
                        timestamp: new Date().getTime() // just create this based on the current time
                    };

                    Log.info("RouteHandler::handleCommentEvent() - request: " + JSON.stringify(commentEvent));
                    RouteHandler.getAutoTest().handleCommentEvent(commentEvent).then((result: boolean) => { // TODO: validate result properties; add an interface
                        Log.info("RouteHandler::commitComment() - success; result: " + result);
                        res.json(200, {});
                    }).catch((err: any) => {
                        Log.error("RouteHandler::commitComment() - failure; ERROR: " + err);
                        res.json(400, "Failed to process commit comment.");
                    });
                } catch (err) {
                    Log.error("RouteHandler::commitComment() - caught error; ERROR: " + err);
                    res.json(400, "Failed to process commit comment");
                }
                break;

            case "push":
                try {

                    // TODO: validate result properties; add an interface
                    const payload = body;
                    team = GithubUtil.getTeamOrProject(payload.repository.name);
                    const repo = payload.repository.name;
                    const projectUrl = payload.repository.html_url;
                    // head commit is sometimes null on new branches
                    const headCommitUrl = payload.head_commit === null ? payload.repository.html_url + "/tree/" + String(payload.ref).replace("refs/heads/", "") : payload.head_commit.url;
                    const commitUrl = headCommitUrl;
                    const commit = payload.commits[0].id; // is this right?
                    const user = String(payload.pusher.name).toLowerCase();
                    // const deliverable = GithubUtil.parseDeliverable(payload.repository.name);
                    // const commit = new Commit(payload.after);
                    const githubOrg = payload.repository.owner.name;
                    // const commentHook = Url.parse(payload.repository.commits_url.replace("{/sha}", "/" + this._commit) + "/comments");
                    const ref = payload.ref;
                    const timestamp = payload.repository.pushed_at * 1000;

                    // const controller: PushController = new PushController(currentCourseNum);
                    const pushEvent: IPushEvent = {
                        branch: "TBDTBD",
                        repo,
                        commit,
                        commitUrl,
                        projectUrl,
                        timestamp
                    };

                    Log.info("RouteHandler::handlePushEvent() - request: " + JSON.stringify(pushEvent));
                    RouteHandler.getAutoTest().handlePushEvent(pushEvent).then((result: boolean) => {
                        Log.info("RouteHandler::handlePushEvent() - result: " + result);
                        res.json(202, {body: "Commit has been queued"});
                    }).catch((err: any) => {
                        Log.error("RouteHandler::handlePushEvent() - error encountered; ERROR: " + err);
                        res.json(400, "Failed to enqueue commit for testing.");
                    });
                } catch (err) {
                    Log.error("RouteHandler::handlePushEvent() - caught exception; ERROR: " + err);
                    res.json(400, "Failed to enqueue commit for testing.");
                }
                break;
            default:
                Log.warn("RouteHandler::postGithubHook() - [" + team + "] Unhandled GitHub event: " + githubEvent);
        }
        return next();
    }

    protected static parseServerPort(req: restify.Request): number {
        const serverPort = Number(req.headers.host.toString().split(":")[1]);
        Log.trace("RoutHandler::parseServerPort(..) - port: " + serverPort);
        return serverPort;
    }

    protected static parseCourseNum(portNum: number): number {
        // not sure what is happening here
        const courseNum = Number(parseInt(portNum.toString().substring(1), 10));
        Log.trace("RoutHandler::parseCourseNum(..) - port: " + courseNum);
        return courseNum;
    }

    /**
     * Handles ResultRecord objects sent from container
     *  - req should container ResultRecord container with payload
     */
    /*
      public static resultSubmission(req: restify.Request, res: restify.Response, next: restify.Next) {
      let body = req.body;
      let serverPort = RequestHelper.parseServerPort(req);
      let currentCourseNum = RequestHelper.parseCourseNum(serverPort);
      let controller: ResultRecordController = new ResultRecordController(currentCourseNum, req.body)
      let resultPayload: ResultPayload = req.body as ResultPayload;
      controller.store()
        .then((result) => {
          Log.info('RouteHandler::resultSubmission() SUCCESS Saved result ' + resultPayload.response.commit + ' for ' +
            resultPayload.response.committer);
          res.json(202, { response: result });
          //
          return next();
        })
        .catch((err) => {
          Log.error('RouteHandler::resultSubmission() ERROR saving ResultRecord' + resultPayload.response.commit + ' for ' +
            resultPayload.response.commitUrl);
          res.json(500, { response: err });
          return next();
        });
    }
  */

    /**
     * Handles StaticHtml Zip files that are sent and included
     * @return object response with success status and HTML static link or error message
     */
    /*
public static staticHtml(req: restify.Request, res: restify.Response, next: restify.Next) {
  let body = req.body;
  let serverPort = RequestHelper.parseServerPort(req);
  let currentCourseNum = RequestHelper.parseCourseNum(serverPort);
  let controller: StaticHtmlController = new StaticHtmlController(req.body);
  controller.extractZipToDir()
    .then((confirmation) => {
      res.json(202, { response: { htmlStaticPath: confirmation } });
      //
      return next();
    })
    .catch((err) => {
      res.json(500, { response: { error: err } });
      return next();
    });
}
*/
}
