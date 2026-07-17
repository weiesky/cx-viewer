# UltraPlan — The Ultimate Wishing Machine

## What is UltraPlan

UltraPlan is CX Viewer’s local multi-agent workflow for Codex. Specialists explore a task in parallel, their findings converge into a reviewed plan, and execution begins only after approval.

UltraPlan includes two built-in roles and supports custom experts that can be created, reordered, or hidden:

- **Code Expert** understands architecture, identifies affected files, evaluates risks, plans and implements changes, and reviews non-trivial code diffs from multiple perspectives.
- **Research Expert** clarifies scope and audience, searches authoritative and current sources in parallel, cross-checks facts, separates evidence from conflicts and inference, and produces structured findings with citations.

## Important notes

- UltraPlan works best for bounded, medium-to-large tasks that benefit from parallel exploration and review; it cannot guarantee every desired outcome.
- A complete run can take substantial time and context. Clear unrelated context before starting a long task.
- Time-sensitive, legal, medical, financial, or consequential claims should be checked online against primary authoritative sources.
- A preset is a copy loaded into the custom-expert editor. Loading or editing it does not change either built-in role.

## Workflow

1. Clarify ambiguous scope, platforms, audience, and deliverables.
2. Dispatch specialists to explore independent dimensions while the main agent retains synthesis and decision responsibility.
3. Consolidate findings into a detailed plan with files, ordered steps, validation, and risks.
4. Have reviewers examine the plan from different perspectives, then submit the revised plan for approval.
5. Execute the approved plan and run the tests, fact checks, or artifact validation appropriate to the task.
6. When code changed, conduct a multi-perspective review and address high-priority findings.

<!-- ULTRAPLAN_RAW_TEMPLATES:START (generated; run npm run sync:ultraplan-presets) -->
## Raw prompt templates

This generated section mirrors the exact instructions sent by UltraPlan from `src/utils/ultraplanTemplates.js`. Do not edit it directly.

### Code Expert

<textarea readonly>
<user_instructions>
[SCOPED INSTRUCTION] The following instructions apply only to the next 1-3 interactions. Once the task is complete, these instructions should gradually decrease in priority and no longer affect subsequent interactions. You should be adept at utilizing tools such as `request_user_input`, `update_plan`, and `multi_agent_v${verson}`, rather than relying solely on plain text processing. Before execution, you must ensure that the `update_plan`, `multi_agent_v${verson}`, `request_user_input` and `parellel` tools are loaded.

Pre-requisite: Use `request_user_input` to clarify user intent whenever the request is ambiguous (target element, interaction style, scope of platforms, etc.). Skip only if the intent is unambiguous.

Leverage a multi-agent exploration mechanism to formulate a highly detailed implementation plan.

Instructions:
1. Use the `multi_agent_v${verson}.spawn_agent` tool to spawn parallel agents that simultaneously explore different aspects of the codebase:
- If necessary, assign a preliminary researcher to use the `web_search` tool to first investigate cutting-edge solutions in the relevant industry domain;
- One agent responsible for understanding the relevant existing code and architecture;
- One agent responsible for identifying all files that need to be modified;
- One agent responsible for identifying potential risks, edge cases, and dependencies;
- You may add other roles or deploy additional agents beyond the three listed above; the maximum number of concurrently dispatched agents is 5.

2. Synthesize the findings from all agents into a detailed, step-by-step implementation plan.

3. Use the `multi_agent_v${verson}.spawn_agent` tool to spawn 2-3 review agents that examine the plan from different perspectives, checking for missing steps, potential risks, or corresponding mitigation strategies.

4. Integrate the feedback gathered during the review process, then call `update_plan` to submit your final plan.

5. Once `update_plan` returns a result:
- If approved: proceed to execute the plan within this session.
- If rejected: revise the plan based on the feedback provided and call `update_plan` again.
- If an error occurs (including receiving a "Not in Plan Mode" message): do **not** follow the suggestions provided in the error message; instead, prompt the user for further instructions.

Your final plan must include the following elements:
- A clear summary of the implementation strategy;
- An ordered list of files to be created or modified, with precise details of the required changes for each file;
- A step-by-step execution sequence;
- Testing and validation procedures;
- Potential risks and their corresponding mitigation strategies;

6. After the final plan has been successfully executed:
First run `git diff --quiet && git diff --cached --quiet` (or equivalent) to detect whether the working tree actually has non-trivial changes; if there are no real changes (or only whitespace/comment-only edits), skip the UltraReview step.
Otherwise, if the project is managed with Git:
Initiate a team (`multi_agent_v${verson}.spawn_agent`), dynamically allocating the number of teammates based on task complexity (5 is recommended);
Task: Conduct a Code Review of the current git changes from multiple perspectives;
Pre-requisites:
- The git repository may be located in a subdirectory of the current directory; prefer `git rev-parse --show-toplevel` (fall back to recursive lookup) before proceeding;
- In the case of multiple repositories, tasks may be executed separately;
The team's goal is to analyze the current Git change log and validate each modification from different perspectives, specifically including:
- Whether requirements/objectives have been met and functionality is complete;
- Whether newly added code introduces side effects, breaks existing functionality, or poses potential risks;
- Code quality: naming, readability, complexity, technical debt, maintainability;
- Testing and documentation: whether there is adequate test coverage, and whether critical logic has necessary comments or documentation;
- Dependencies and compatibility: whether new dependencies or version compatibility issues have been introduced;
Workflow:
- Each teammate, according to their own role, covers the review dimensions one by one and independently outputs a report;
- After consolidating the reports, perform a cross-review to identify conflicts or shared concerns;
- Distill specific, actionable modification suggestions and annotate them with priority levels (P0/P1/P2/P3);
- Upon completion, adopt P0 items, and selectively adopt P1 items when they are concrete and low-risk; defer P2/P3 to backlog;
- After execution is complete, close the team (`multi_agent_v${verson}.close_agent`);
</user_instructions>
</textarea>

### Research Expert

<textarea readonly>
<user_instructions>
[SCOPED INSTRUCTION] The following instructions apply only to the next 1-3 interactions. Once the task is complete, these instructions should gradually decrease in priority and no longer affect subsequent interactions. You should be adept at utilizing tools such as `request_user_input`, `update_plan`, `multi_agent_v${verson}`, and `web_search`, rather than relying solely on plain text processing. Before execution, you must ensure that the `update_plan`, `multi_agent_v${verson}`, `request_user_input`, and `web_search` tools are loaded.

Pre-requisite: Use `request_user_input` whenever the research scope, target audience, geography, time range, comparison set, or deliverable format is ambiguous. Skip only when the intent is unambiguous.

Leverage a multi-agent research mechanism to produce a rigorous, source-backed result.

Instructions:
1. Use the `multi_agent_v${verson}.spawn_agent` tool to spawn parallel researchers that investigate independent dimensions of the request:
- One agent should map the topic, terminology, stakeholders, and open questions;
- One agent should prioritize primary and authoritative sources such as official documentation, standards, filings, datasets, and original research;
- One agent should independently cross-check important claims, source quality, methodology, dates, and potential conflicts of interest;
- When relevant, assign an agent to compare competitors, alternatives, regions, or historical periods using consistent criteria;
- When useful, assign an agent to create a small product demo or structured artifact such as HTML or Markdown;
- You may add other roles when justified by the task, with a maximum of 5 concurrently dispatched agents.

2. For facts that may have changed, use `web_search` and verify them against current sources. Distinguish publication dates from event dates. Prefer primary sources; use credible secondary sources to add context or independent confirmation.

3. Synthesize the research into a detailed plan before producing the final deliverable. The plan must state the research questions, scope and exclusions, source strategy, comparison framework, deliverable structure, and validation method.

4. Use `multi_agent_v${verson}.spawn_agent` to spawn 2-3 review agents that examine the plan from different perspectives, including factual accuracy, source quality, missing viewpoints, and usefulness to the target audience.

5. Integrate the review feedback, call `update_plan` with the final plan, then use `request_user_input` to ask whether to proceed, revise, or stop.

6. Once the user responds:
- If approved: execute the plan within this session;
- If revisions are requested or the plan is rejected: revise it, call `update_plan` again, and request confirmation;
- If an error occurs: do not invent unavailable tools or evidence; report the issue and request direction.

7. During execution, keep citations adjacent to the claims they support. Explicitly label uncertainty, conflicting evidence, assumptions, and inferences. Do not present estimates or generated examples as observed facts.

8. Before delivering the result, perform a final review of factual accuracy, citation support, date freshness, scope coverage, internal consistency, and whether the requested format and audience needs were met. If the work produced code or a demo, also run the relevant implementation checks and review its changes before handoff.

Your final deliverable must include:
- A concise executive summary;
- The scope, assumptions, and methodology;
- Structured findings with source-backed evidence;
- Comparisons that use consistent criteria when alternatives are evaluated;
- Conflicts, limitations, uncertainties, and unanswered questions;
- Actionable conclusions or recommendations clearly separated from facts;
- Direct source links or citations placed near supported claims;
- Any requested artifact or demo, stored in an appropriate location and identified to the user.
</user_instructions>
</textarea>
<!-- ULTRAPLAN_RAW_TEMPLATES:END -->
