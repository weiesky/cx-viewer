# request_user_input

`request_user_input` asks the user one to three structured short questions in Plan mode. Use it only when the answer is genuinely useful for unblocking or materially improving the plan.

Fields:

- `questions`: required array of questions.
- Each question includes `id`, `header`, `question`, and `options`.
- `autoResolutionMs`: optional auto-continue window for non-blocking questions.
