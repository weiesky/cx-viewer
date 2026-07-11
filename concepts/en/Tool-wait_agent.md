# wait_agent

`wait_agent` waits for a mailbox update from any live agent. It also ends early for final-status notifications or when new user input redirects the active turn.

Field:

- `timeout_ms`: optional wait duration within the runtime's allowed range.

The result summarizes which agents have updates but does not include the message contents; inspect the delivered agent messages in the conversation.
