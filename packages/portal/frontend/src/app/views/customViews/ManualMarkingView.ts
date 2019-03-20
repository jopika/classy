import {OnsButtonElement} from "onsenui";
import Log from "../../../../../../common/Log";
import {AssignmentGrade, AssignmentRubric} from "../../../../../../common/types/CS340Types";
import {
    DeliverableTransport,
    GradeTransport,
    Payload,
    TeamFormationTransport,
    TeamTransport
} from "../../../../../../common/types/PortalTypes";
import {SortableTable, TableCell, TableHeader} from "../../util/SortableTable";
import {UI} from "../../util/UI";
import {GradingPageView} from "../GradingPage";
import {StudentView} from "../StudentView";

export class ManualMarkingView extends StudentView {

    protected teams: TeamTransport[];
    protected deliverables: DeliverableTransport[];
    protected delivGradeMap: Map<string, GradeTransport>;
    protected delivMap: Map<string, DeliverableTransport>;
    public loggingName: string;

    constructor(remoteUrl: string, customLoggingName: string = `ManualMarkingView`) {
        super();
        this.remote = remoteUrl;
        this.loggingName = `Super${customLoggingName}`;
        this.delivGradeMap = new Map<string, GradeTransport>();
        this.delivMap = new Map<string, DeliverableTransport>();
    }

    public renderPage(opts: {}) {
        Log.info(`${this.loggingName}::renderPage() - start; options: ` + opts);
        const that = this;
        const start = Date.now();

        UI.showModal(`Fetching data.`);

        // try {
        //     await super.render();
        //     await this.renderStudentPage();
        //     Log.info(`${that.loggingName}::renderPage(..) - prep & render took: ` + UI.took(start));
        //     UI.hideModal();
        // } catch (err) {
        //     Log.error(`${that.loggingName}::renderPage() - ERROR: ` + err);
        //     UI.hideModal();
        // }

        super.render().then(function() {
            // super render complete; do custom work
            return that.renderStudentPage();
        }).then(function() {
            Log.info(`${that.loggingName}::renderPage(..) - prep & render took: ` + UI.took(start));
            UI.hideModal();
        }).catch(function(err) {
            Log.error(`${that.loggingName}::renderPage() - ERROR: ` + err);
            UI.hideModal();
        });
    }

    /**
     * Handles rendering of all data; after StudentView runs
     * @returns {Promise<void>}
     */
    protected async renderStudentPage(): Promise<void> {
        UI.showModal(`Fetching Data`);
        try {
            Log.info(`${this.loggingName}::renderStudentPage(..) - start`);

            // grades rendered in StudentView

            // teams rendered here
            const teams = await this.fetchTeamData();
            this.teams = teams;
            // await this.renderTeams(teams);

            UI.hideSection(`studentSelectPartnerDiv`);
            UI.hideSection(`studentPartnerDiv`);

            await this.fetchDeliverableData();

            await this.renderDeliverables();

            for (const grade of this.grades) {
                this.delivGradeMap.set(grade.delivId, grade);
            }

            for (const deliv of this.deliverables) {
                this.delivMap.set(deliv.id, deliv);
            }

            await this.updateTeams();

            await this.renderFinalGrade();

            Log.info(`${this.loggingName}::renderStudentPage(..) - done`);
        } catch (err) {
            Log.error(`Error encountered: ` + err.message);
        }
        UI.hideModal();
        return;
    }

    protected async handleGradeChange(delivId: string): Promise<void> {
        Log.info(`${this.loggingName}::handleGradeChange(${delivId}) - start`);

        if (delivId === `--N/A--`) {
            UI.hideSection(`studentGradesDiv`);
            UI.hideSection(`studentNoGradesDiv`);
            return;
        }

        if (this.delivGradeMap.has(delivId)) {
            const grade: GradeTransport = this.delivGradeMap.get(delivId);
            const deliv: DeliverableTransport = this.delivMap.get(delivId);
            const customGrade = grade.custom;
            const studentGradeTable = document.getElementById(`studentGradeBreakdownTable`);
            if (typeof customGrade.assignmentGrade === `undefined` || typeof deliv.rubric === `undefined` ||
                typeof (deliv.rubric as AssignmentRubric).questions === `undefined`) {
                // display normal grade
                studentGradeTable.innerHTML = `Grade: ${grade.score}`;
            } else {
                const rubric: AssignmentRubric = deliv.rubric as AssignmentRubric;
                const assignmentGrade: AssignmentGrade = customGrade.assignmentGrade;
                const headers: TableHeader[] = [{
                    id: `exerciseId`,
                    text: `Exercise Name`,
                    sortable: false,
                    defaultSort: false,
                    sortDown: false,
                    style: `padding-left: 1em; padding-right: 1em; text-align: left`,
                }, {
                    id: `letterGrade`,
                    text: `Letter Grade`,
                    sortable: false,
                    defaultSort: false,
                    sortDown: false,
                    style: `padding-left: 1em; padding-right: 1em; text-align: center;`
                }, {
                    id: `scaledScore`,
                    text: `Scaled Score`,
                    sortable: false,
                    defaultSort: false,
                    sortDown: false,
                    style: `padding-left: 1em; padding-right: 1em; text-align: center;`
                }, {
                    id: `grade`,
                    text: `Grade`,
                    sortable: false,
                    defaultSort: false,
                    sortDown: false,
                    style: `padding-left: 1em; padding-right: 1em; text-align: center;`
                }, {
                    id: `outOf`,
                    text: `Out Of`,
                    sortable: false,
                    defaultSort: false,
                    sortDown: false,
                    style: `padding-left: 1em; padding-right: 1em; text-align: center;`
                }, {
                    id: `feedback`,
                    text: `Feedback`,
                    sortable: false,
                    defaultSort: false,
                    sortDown: false,
                    style: `padding-left: 1em; padding-right: 1em; text-align: center;`
                }];

                const st = new SortableTable(headers, `#studentGradeBreakdownTable`);
                let totalGrade: number = 0;
                let maxGrade: number = 0;

                for (let i = 0; i < assignmentGrade.questions.length; i++) {
                    const question = assignmentGrade.questions[i];
                    for (let j = 0; j < question.subQuestions.length; j++) {
                        if (i < rubric.questions.length && j < rubric.questions[i].subQuestions.length) {
                            const subRubric = rubric.questions[i].subQuestions[j];
                            const subQuestion = question.subQuestions[j];

                            const newRow: TableCell[] = [];
                            newRow.push({
                                    value: `${question.name} ${subQuestion.name}`,
                                    html: `${question.name} ${subQuestion.name}`
                                }
                            );

                            const gradeValue = subQuestion.grade;
                            const gradeOutOf = subRubric.outOf;
                            // const gradeRatio: number = (gradeValue / gradeOutOf) * 100;

                            const letterGrade = GradingPageView.getLetterGrade(gradeValue, gradeOutOf);
                            const letterMidpoint = GradingPageView.getLetterGradeMidpoint(letterGrade);

                            newRow.push({
                                value: letterGrade,
                                html: letterGrade,
                            });

                            newRow.push({
                                value: `${letterMidpoint.toFixed(1)} %`,
                                html: `${letterMidpoint.toFixed(1)} %`,
                            });

                            newRow.push({
                                value: gradeValue.toFixed(2).toString(),
                                html: gradeValue.toFixed(2).toString()
                            });
                            newRow.push({value: gradeOutOf.toString(), html: gradeOutOf.toString()});
                            newRow.push({value: subQuestion.feedback, html: subQuestion.feedback});

                            totalGrade += subQuestion.grade * subRubric.weight;
                            maxGrade += subRubric.outOf;

                            st.addRow(newRow);
                        }
                    }
                }

                const totalRow: TableCell[] = [];
                totalRow.push({
                    value: `Total Grade`,
                    html: `<b>Total Grade</b>`
                });
                totalRow.push({
                    value: ``,
                    html: ``
                });
                totalRow.push({
                    value: ``,
                    html: ``
                });
                totalRow.push({
                    value: totalGrade.toFixed(2).toString(),
                    html: totalGrade.toFixed(2).toString()
                });
                totalRow.push({
                    value: maxGrade.toString(),
                    html: maxGrade.toString()
                });
                totalRow.push({
                    value: `Final grade: ${((totalGrade / maxGrade) * 100).toFixed(2)} %`,
                    html: `Final grade: ${((totalGrade / maxGrade) * 100).toFixed(2)} %`
                });

                st.addRow(totalRow);

                // for (const question of assignmentGrade.questions) {
                //     //
                //     for (const subQuestion of question.subQuestions) {
                //         const newRow: TableCell[] = [];
                //         newRow.push({value: subQuestion.name, html: subQuestion.name});
                //         newRow.push({value: subQuestion.grade.toString(), html: subQuestion.grade.toString()});
                //         newRow.push({value: subQuestion.outOf, html: subQuestion.outOf}); // need the rubric
                //         newRow.push({value: subQuestion.feedback, html: subQuestion.feedback});
                //         st.addRow(newRow);
                //     }
                // }

                st.generate();

                UI.showSection(`studentGradesDiv`);
                UI.hideSection(`studentNoGradesDiv`);
            }

        } else {
            UI.hideSection(`studentGradesDiv`);
            UI.showSection(`studentNoGradesDiv`);
        }

        return;
    }

    protected async fetchTeamData(): Promise<TeamTransport[]> {
        try {
            this.teams = null;
            let data: TeamTransport[] = await this.fetchData(`/portal/teams`);
            if (data === null) {
                data = [];
            }
            this.teams = data;
            return data;
        } catch (err) {
            Log.error(`${this.loggingName}::fetchTeamData(..) - ERROR: ` + err.message);
            this.teams = [];
            return [];
        }
    }

    protected async fetchDeliverableData(): Promise<DeliverableTransport[]> {
        Log.info(`MDSAdminView::fetchDeliverableData() - start`);
        try {
            this.deliverables = null;
            const data = await this.fetchData(`/portal/cs340/deliverables`) as DeliverableTransport[];

            this.deliverables = data;
            return data;
        } catch (err) {
            Log.error(`${this.loggingName}::fetchDeliverableData() - Error: ${JSON.stringify(err)}`);
            this.teams = [];
            return [];
        }
    }

    protected populateDeliverableDropdown(dropdownId: string): HTMLSelectElement {
        Log.info(`${this.loggingName}::populateDeliverableDropdown(${dropdownId}) - string`);

        const delivSelectElement = document.getElementById(dropdownId) as HTMLSelectElement;
        if (delivSelectElement === null) {
            Log.error(`${this.loggingName}::populateDeliverableDropdown(..) - Error: Unable to find dropdown with id: ${dropdownId}`);
            return null;
        }

        const deliverables = this.deliverables;
        const delivOptions: string[] = [`--N/A--`];

        for (const deliv of deliverables) {
            delivOptions.push(deliv.id);
        }

        delivSelectElement.innerHTML = ``;
        for (const delivOption of delivOptions) {
            const option = document.createElement(`option`);

            option.innerText = delivOption;

            delivSelectElement.appendChild(option);
        }

        return delivSelectElement;
    }

    protected async renderDeliverables(): Promise<void> {
        Log.info(`${this.loggingName}::renderDeliverables(..) - start`);

        const that = this;
        const delivSelectElement = this.populateDeliverableDropdown(`studentDeliverableSelect`);

        Log.info(`${this.loggingName}::renderDeliverables(..) - hooking event listener`);

        delivSelectElement.addEventListener(`change`, async (evt) => {
            await that.handleGradeChange((evt.target as HTMLSelectElement).value);
            await that.updateTeams();
        });

        Log.info(`${this.loggingName}::renderDeliverables(..) - finished hooking event listener`);

        Log.info(`${this.loggingName}::renderDeliverables(..) - finished rendering deliverable`);

        return;
    }

    protected async updateTeams(): Promise<void> {
        Log.info(`${this.loggingName}::updateTeams(..) - start`);

        const teams: TeamTransport[] = this.teams;
        const that = this;
        UI.hideSection(`studentSelectPartnerDiv`);
        UI.hideSection(`studentPartnerDiv`);

        const delivSelectElement = document.querySelector(`#studentDeliverableSelect`) as HTMLSelectElement;
        // get the deliverable ID
        const delivId = delivSelectElement.value;
        if (delivId === `--N/A--`) {
            return;
        }
        Log.info(`${this.loggingName}::updateTeams(..) - selected ` + delivId);

        let found = false;
        let selectedTeam;
        for (const team of teams) {
            if (team.delivId === delivId) {
                found = true;
                selectedTeam = team;
            }
        }

        if (found) {
            const partnerInfo = document.getElementById(`studentPartnerInfo`);
            let embeddedTeamName;
            if (selectedTeam.URL !== null) {
                embeddedTeamName = `<a href=${selectedTeam.URL}>${selectedTeam.id}</a>`;
                // tName.innerHTML = `<a href=`` + selectedTeam.URL + ``>` + selectedTeam.id + `</a>`;
            } else {
                embeddedTeamName = `${selectedTeam.id}`;
                // tName.innerHTML = selectedTeam.id;
            }
            const formattedString = `Your team is ${embeddedTeamName}; your team is: ${JSON.stringify(selectedTeam.people)}`;
            // pName.innerHTML = JSON.stringify(selectedTeam.people);
            partnerInfo.innerHTML = formattedString;
            UI.showSection(`studentPartnerDiv`);
        } else {
            const button = document.querySelector(`#studentSelectPartnerButton`) as OnsButtonElement;

            button.onclick = async function(evt: any) {
                const selectedID = (document.querySelector(`#studentDeliverableSelect`) as HTMLSelectElement).value;

                Log.info(`${that.loggingName}::updateTeams(..)::createTeam::onClick - selectedDeliv: ` + selectedID);
                const teamCreation: TeamTransport = await that.formTeam(selectedID);
                Log.info(`${that.loggingName}::updateTeams(..)::createTeam::onClick::then - result: ` + JSON.stringify(teamCreation));
                if (teamCreation === null) {
                    return;
                }
                that.teams.push(teamCreation);

                UI.hideSection(`studentSelectPartnerDiv`);
                that.renderPage({});
            };

            const minTeam = document.querySelector(`#minimumNum`);
            const maxTeam = document.querySelector(`#maximumNum`);

            for (const delivInfo of this.deliverables) {
                if (delivInfo.id === delivId) {
                    minTeam.innerHTML = delivInfo.minTeamSize.toString();
                    maxTeam.innerHTML = delivInfo.maxTeamSize.toString();

                    if (delivInfo.maxTeamSize === 1) {
                        UI.hideSection(`studentSelectPartnerDiv`);
                        UI.hideSection(`studentPartnerDiv`);
                        return;
                    }
                }
            }

            UI.showSection(`studentSelectPartnerDiv`);
            return;
        }
    }

    protected async formTeam(selectedDeliv: string): Promise<TeamTransport> {
        Log.info(`${this.loggingName}::formTeam() - start`);
        const otherIds = UI.getTextFieldValue(`studentSelectPartnerText`);
        // split the other IDs by semicolons
        const idArray: string[] = otherIds.split(`;`);
        const myGithubId = this.getStudent().githubId;
        const githubIds: string[] = [];
        githubIds.push(myGithubId);
        for (const id of idArray) {
            githubIds.push(id.trim());
        }

        const payload: TeamFormationTransport = {
            // delivId:   selectedTeam,
            delivId: selectedDeliv,
            githubIds: githubIds
        };
        const url = this.remote + `/portal/team`;
        const options: any = this.getOptions();
        options.method = `post`;
        options.body = JSON.stringify(payload);

        Log.info(`${this.loggingName}::formTeam() - URL: ` + url + `; payload: ` + JSON.stringify(payload));
        const response = await fetch(url, options);

        Log.info(`${this.loggingName}::formTeam() - responded`);

        const body = await response.json() as Payload;

        Log.info(`${this.loggingName}::formTeam() - response: ` + JSON.stringify(body));

        if (typeof body.success !== `undefined`) {
            // worked
            UI.notificationToast(`Successfully formed team with: ${JSON.stringify(idArray)}`);
            return body.success as TeamTransport;
        } else if (typeof body.failure !== `undefined`) {
            // failed
            UI.showError(body);
            return null;
        } else {
            Log.error(`${this.loggingName}::formTeam() - else ERROR: ` + JSON.stringify(body));
        }
    }

    protected async renderFinalGrade(): Promise<void> {
        Log.info(`${this.loggingName}::renderFinalGrade(..) - start`);

        // checking if final grade is released

        const result = await this.fetchData(`/portal/cs340/isFinalGradeReleased`);
        // const result = true;
        if (result) {
            Log.info(`${this.loggingName}::renderFinalGrade(..) - Grades released; rendering`);

            const headers: TableHeader[] = [{
                id: `itemId`,
                text: `Item`,
                sortable: true,
                defaultSort: false,
                sortDown: false,
                style: `padding-left: 1em; padding-right: 1em; text-align: left`,
            }, {
                id: `weight`,
                text: `Weight`,
                sortable: false,
                defaultSort: false,
                sortDown: false,
                style: `padding-left: 1em; padding-right: 1em; text-align: center;`
            }, {
                id: `grade`,
                text: `Grade`,
                sortable: false,
                defaultSort: false,
                sortDown: false,
                style: `padding-left: 1em; padding-right: 1em; text-align: center;`
            }];

            // prepare table
            const st = new SortableTable(headers, `#studentFinalGradeTable`);
            let totalWeightedGrade: number = 0;
            let totalWeightedMaxGrade: number = 0;

            // get each deliverable and render
            for (const deliverableTransport of this.deliverables) {
                // get grade
                let score = 0;
                if (this.delivGradeMap.has(deliverableTransport.id)) {
                    Log.info(`${this.loggingName}::renderFinalGrades(..) - retriving score`);

                    const grade: GradeTransport = this.delivGradeMap.get(deliverableTransport.id);
                    score = grade.score;
                }

                let maxScore = score;
                if (deliverableTransport.rubric !== null && typeof deliverableTransport.rubric !== `undefined`) {
                    // get max grade
                    Log.info(`${this.loggingName}::renderFinalGrades(..) - calculating maxScore`);
                    maxScore = this.getMaxScore(deliverableTransport.rubric as AssignmentRubric);
                }

                let weight = 1;

                if (typeof (deliverableTransport.custom as any).assignment !== `undefined` &&
                    (deliverableTransport.custom as any).assignment !== null) {
                    weight = (deliverableTransport.custom as any).assignment.courseWeight;
                }

                const weightedScore = score * weight;
                const weightedTotal = maxScore * weight;
                const gradeValue = (score / maxScore) * 100;

                totalWeightedGrade += weightedScore;
                totalWeightedMaxGrade += weightedTotal;

                // TODO: Complete this
                const newRow: TableCell[] = [];
                newRow.push({
                    value: `${deliverableTransport.id}`,
                    html: `${deliverableTransport.id}`
                });

                newRow.push({
                    value: `${weight}`,
                    html: `${weight}`
                });

                newRow.push({
                    value: `${Math.round(gradeValue)}%`,
                    html: `${Math.round(gradeValue)}%`
                });

                st.addRow(newRow);
            }

            const totalRow: TableCell[] = [];

            totalRow.push({
                value: `Total`,
                html: `<b>Total</b>`
            });

            // totalRow.push({
            //     value: ``,
            //     html: ``
            // });
            //
            // totalRow.push({
            //     value: ``,
            //     html: ``
            // });
            //
            // const percentRaw: number = (totalWeightedGrade / totalWeightedMaxGrade) * 100;
            //
            // totalRow.push({
            //     value: `${percentRaw.toFixed(2)}%`,
            //     html: `${percentRaw.toFixed(2)}%`,
            // });

            totalRow.push({
                value: ``,
                html: ``
            });

            totalRow.push({
                value: `${Math.round(totalWeightedGrade)}%`,
                html: `${Math.round(totalWeightedGrade)}%`
            });

            // totalRow.push({
            //     value: `${totalWeightedMaxGrade}`,
            //     html: `${totalWeightedMaxGrade}`
            // });

            st.addRow(totalRow);

            st.generate();
            UI.showSection(`studentFinalGradeSection`);
        } else {
            Log.info(`${this.loggingName}::renderFinalGrade(..) - Grades not released; hiding section`);
            UI.hideSection(`studentFinalGradeSection`);
        }

        return;
    }

    protected getMaxScore(deliverableRubric: AssignmentRubric): number {
        Log.info(`${this.loggingName}::getMaxScore(..) - start`);
        if (deliverableRubric === null || typeof deliverableRubric.questions === `undefined`) {
            Log.info(`${this.loggingName}::getMaxScore(..) - No rubric`);
            return 0;
        }

        let maxScore = 0;
        for (const question of deliverableRubric.questions) {
            for (const subQuestion of question.subQuestions) {
                maxScore += subQuestion.outOf * subQuestion.weight;
            }
        }

        return maxScore;
    }
}
