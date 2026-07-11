# create_goal

`create_goal` starts a new active goal only when the user or system explicitly asks for one. It fails if an unfinished goal already exists.

Fields:

- `objective`: concrete objective, required.
- `token_budget`: optional; set it only when the user explicitly asks for a token budget.
