# UltraPlan — The Ultimate Wishing Machine

## What is UltraPlan

UltraPlan is cc-viewer's **localized implementation** of Claude Code's native `/ultraplan` command. It allows you to use the full capabilities of `/ultraplan` in your local environment **without needing to launch Claude's official remote service**, guiding Claude Code to accomplish complex planning and implementation tasks using **multi-agent collaboration**.

Compared to regular Plan mode or Agent Team, UltraPlan can:
- Automatically assess task complexity and select the optimal planning strategy
- Deploy multiple parallel agents to explore the codebase from different dimensions
- Incorporate external research (webSearch) for industry best practices
- Automatically assemble a Code Review Team after plan execution for code review
- Form a complete **Plan → Execute → Review → Fix** closed loop

---

## Important Notes

### 1. UltraPlan Is Not Omnipotent
UltraPlan is a more powerful wishing machine, but that doesn't mean every wish can be fulfilled. It's more powerful than Plan and Agent Team, but it can't directly "make you money." Consider reasonable task granularity — break large goals into executable medium-sized tasks rather than trying to accomplish everything in one shot.

### 2. Currently Most Effective for Programming Projects
UltraPlan's templates and workflows are deeply optimized for programming projects. Other scenarios (documentation, data analysis, etc.) can be attempted, but you may want to wait for future version adaptations.

### 3. Execution Time and Context Window Requirements
- A successful UltraPlan run typically takes **30 minutes or more**
- Requires MainAgent to have a large context window (1M context Opus model recommended)
- If you only have a 200K model, **make sure to `/clear` context before running**
- Claude Code's `/compact` performs poorly when the context window is insufficient — avoid running out of space
- Maintaining sufficient context space is a critical prerequisite for successful UltraPlan execution

If you have any questions or suggestions about the localized UltraPlan, feel free to open [Issues on GitHub](https://github.com/anthropics/claude-code/issues) to discuss and collaborate.

---

## How It Works

UltraPlan offers two operating modes:

### Auto Mode
Automatically analyzes task complexity (score 4-12) and routes to different strategies:

| Route | Score | Strategy |
|-------|-------|----------|
| Route A | 4-6 | Lightweight planning with direct code exploration |
| Route B | 7-9 | Planning with structural diagrams (Mermaid / ASCII) |
| Route C | 10-12 | Multi-agent exploration + review closed loop |

### Forced Mode
Directly activates the full Route C multi-agent workflow:
1. Deploy up to 5 parallel agents to explore the codebase simultaneously (architecture, file identification, risk assessment, etc.)
2. Optionally deploy a research agent to investigate industry solutions via webSearch
3. Synthesize all agent findings into a detailed implementation plan
4. Deploy a review agent to scrutinize the plan from multiple perspectives
5. Execute the plan once approved
6. Automatically assemble a Code Review Team to validate code quality after implementation
