/**
 * Ultraplan prompt templates for local Codex execution.
 *
 * Two expert roles:
 *   - codeExpert:     Multi-agent code planning & implementation (from subagents template)
 *   - researchExpert: Multi-agent research & analysis
 *
 * Assembly logic mirrors ~/codex-code/commands/ultraplan.tsx:63-73
 *   buildUltraplanPrompt(blurb, seedPlan?)
 */

export const ULTRAPLAN_VARIANTS = {

  codeExpert: `<user_instructions>
[SCOPED INSTRUCTION] The following instructions apply only to the next 1-3 interactions. Once the task is complete, these instructions should gradually decrease in priority and no longer affect subsequent interactions. You should be adept at utilizing tools such as \`request_user_input\`, \`update_plan\`, and \`multi_agent_v\${verson}\`, rather than relying solely on plain text processing. Before execution, you must ensure that the \`update_plan\`, \`multi_agent_v\${verson}\`, \`request_user_input\` and \`parellel\` tools are loaded.

Pre-requisite: Use \`request_user_input\` to clarify user intent whenever the request is ambiguous (target element, interaction style, scope of platforms, etc.). Skip only if the intent is unambiguous.

Leverage a multi-agent exploration mechanism to formulate a highly detailed implementation plan.

Instructions:
1. Use the \`multi_agent_v\${verson}.spawn_agent\` tool to spawn parallel agents that simultaneously explore different aspects of the codebase:
- If necessary, assign a preliminary researcher to use the \`web_search\` tool to first investigate cutting-edge solutions in the relevant industry domain;
- One agent responsible for understanding the relevant existing code and architecture;
- One agent responsible for identifying all files that need to be modified;
- One agent responsible for identifying potential risks, edge cases, and dependencies;
- You may add other roles or deploy additional agents beyond the three listed above; the maximum number of concurrently dispatched agents is 5.

2. Synthesize the findings from all agents into a detailed, step-by-step implementation plan.

3. Use the \`multi_agent_v\${verson}.spawn_agent\` tool to spawn 2-3 review agents that examine the plan from different perspectives, checking for missing steps, potential risks, or corresponding mitigation strategies.

4. Integrate the feedback gathered during the review process, then call \`update_plan\` to submit your final plan.

5. Once \`update_plan\` returns a result:
- If approved: proceed to execute the plan within this session.
- If rejected: revise the plan based on the feedback provided and call \`update_plan\` again.
- If an error occurs (including receiving a "Not in Plan Mode" message): do **not** follow the suggestions provided in the error message; instead, prompt the user for further instructions.

Your final plan must include the following elements:
- A clear summary of the implementation strategy;
- An ordered list of files to be created or modified, with precise details of the required changes for each file;
- A step-by-step execution sequence;
- Testing and validation procedures;
- Potential risks and their corresponding mitigation strategies;

6. After the final plan has been successfully executed:
First run \`git diff --quiet && git diff --cached --quiet\` (or equivalent) to detect whether the working tree actually has non-trivial changes; if there are no real changes (or only whitespace/comment-only edits), skip the UltraReview step.
Otherwise, if the project is managed with Git:
Initiate a team (\`multi_agent_v\${verson}.spawn_agent\`), dynamically allocating the number of teammates based on task complexity (5 is recommended);
Task: Conduct a Code Review of the current git changes from multiple perspectives;
Pre-requisites:
- The git repository may be located in a subdirectory of the current directory; prefer \`git rev-parse --show-toplevel\` (fall back to recursive lookup) before proceeding;
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
- After execution is complete, close the team (\`multi_agent_v\${verson}.close_agent\`);
</user_instructions>`,

  researchExpert: `<user_instructions>
[SCOPED INSTRUCTION] The following instructions are intended for the next 1–3 interactions. Once the task is complete, these instructions should be gradually deprioritized and no longer influence subsequent interactions. You should be adept at utilizing Codex tools such as \`request_user_input\`, \`update_plan\`, \`tool_search\`, and \`web_search\`, rather than relying solely on plain text processing. Before execution, ensure that \`request_user_input\`, \`update_plan\`, and \`tool_search\` are available; use \`tool_search\` to discover any deferred multi-agent tools before attempting to spawn agents.

Pre-requisite: Use \`request_user_input\` to clarify the research scope, target audience, and deliverable format whenever the user's intent is ambiguous. Skip only if the intent is unambiguous.

Leverage a multi-agent exploration mechanism to formulate an exceptionally detailed implementation plan.

Instructions:
1. Use \`tool_search\` to discover multi-agent tools, then spawn parallel agents when those tools are available so they can simultaneously explore various facets of the requirements:
- If necessary, deploy a preliminary investigator to conduct an initial survey of industry-specific solutions using \`web_search\`;
- If necessary, deploy a specialized investigator to research authoritative sources—such as academic papers, news articles, and research reports—using \`web_search\`;
- Assign an agent to synthesize the target solution, while simultaneously verifying the rigor and credibility of the gathered papers, news, and research reports;
- If necessary, assign an agent to analyze competitor data to provide supplementary analytical perspectives;
- If necessary, assign an agent to handle the implementation of a product demo (generating outputs such as HTML, Markdown, etc.);
- If the task is sufficiently complex, you may assign additional teammates to the roles defined above, or introduce other specialized roles; you are permitted to schedule up to 5 teammates concurrently.

2. Synthesize the findings from the aforementioned agents into a comprehensive, step-by-step implementation plan.

3. Use the available multi-agent tools to spawn a set of parallel review agents; these agents shall scrutinize the plan from multiple roles and perspectives to identify any omitted steps and to propose reasonable additions or optimizations.

4. Consolidate the feedback received from the review agents, then call \`update_plan\` with the final plan and use \`request_user_input\` to ask the user whether to proceed, revise, or stop.

5. Once the user responds:
- If approved: proceed to execute the plan within this current session.
- If revisions are requested or the plan is rejected: revise the plan based on the provided feedback, call \`update_plan\` again, and ask for confirmation.
- If an error occurs: do *not* improvise around missing tools; instead, prompt the user for further instructions.

Your final plan must include the following elements:
- A clear summary of the proposed implementation strategy;
- An ordered list of files to be created or modified, specifying the exact changes required for each;
- A step-by-step sequence for executing the implementation;
- Identification of potential risks and corresponding mitigation strategies;
- Creative ideation and suggestions for advanced enhancements;
- If a product demo was generated, place the corresponding demo output in an appropriate location and notify the user.
</user_instructions>`,

};

/**
 * Wrap user-authored custom instruction body with the same scoped-instruction
 * preamble used by the built-in variants. Produces a full <user_instructions>
 * block ready to be inlined into a Codex prompt.
 */
export function buildCustomTemplate(content) {
  const body = (content || '').trim();
  if (!body) return '';
  // 用户已自带外壳(预填的样板壳或手写)时不再重复包裹;用 startsWith 而非 includes,
  // 避免正文里只是「提到」<user_instructions> 字样就误判而漏掉作用域声明。
  if (body.startsWith('<user_instructions>')) return body;
  return `<user_instructions>
[SCOPED INSTRUCTION] The following instructions apply only to the next 1-3 interactions. Once the task is complete, these instructions should gradually decrease in priority and no longer affect subsequent interactions. You should be adept at utilizing tools such as \`request_user_input\`, \`update_plan\`, and \`multi_agent_v\${verson}\`, rather than relying solely on plain text processing. Before execution, you must ensure that the \`update_plan\`, \`multi_agent_v\${verson}\`, \`request_user_input\` and \`parellel\` tools are loaded.

${body}
</user_instructions>`;
}

/**
 * Assemble a local ultraplan prompt.
 * Mirrors ~/codex-code/commands/ultraplan.tsx:63-73 buildUltraplanPrompt()
 *
 * @param {string} userPrompt - User's task description
 * @param {'codeExpert'|'researchExpert'|'custom'} variant - Template variant
 * @param {string} [seedPlan] - Optional draft plan to refine
 * @param {string} [customContent] - Required when variant === 'custom': the user-authored body
 * @returns {string} Assembled prompt ready to send to Codex
 */
export function buildLocalUltraplan(userPrompt, variant = 'codeExpert', seedPlan, customContent) {
  let template;
  if (variant === 'custom') {
    template = buildCustomTemplate(customContent);
    if (!template) return '';
  } else {
    template = ULTRAPLAN_VARIANTS[variant] || ULTRAPLAN_VARIANTS.codeExpert;
  }
  const parts = [];
  if (seedPlan) {
    parts.push('Here is a draft plan to refine:', '', seedPlan, '');
  }
  parts.push(template);
  if (userPrompt) {
    parts.push('', userPrompt);
  }
  return parts.join('\n');
}
