# request_user_input

`request_user_input` asks the user one to three structured short questions when it is loaded in the current tool catalog; it is available in both Default and Plan modes. In Default mode, prefer safe, reasonable assumptions and continued execution, and use it only when a missing user choice would create material risk or genuinely block progress.

Fields:

- `questions`: required array of questions.
- Each question includes `id`, `header`, `question`, and `options`.
- `autoResolutionMs`: optional auto-continue window for non-blocking questions.
