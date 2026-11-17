# wait

`wait` resumes a yielded `exec` cell and returns only its new output or final completion state.

Fields:

- `cell_id`: running exec cell identifier, required.
- `yield_time_ms`: how long to wait before yielding again.
- `max_tokens`: output budget for this wait call.
- `terminate`: stop the cell instead of waiting when true.

Use it only after `exec` reports that the script is still running and provides a cell id.
