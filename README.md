# Unethical-Hackers
Hacksmith v6.0

## Resetting progress

- Reset hacking progress in Juice Shop (via the Score Board’s ‘Delete cookie to clear hacking progress’ button) clears the built-in Juice Shop scoreboard.
- Reset coach history (via the button in Trainer mode) clears all hints-used counts and notes stored by the Juice Shop Coach extension for this browser, and also sends a best-effort request to the backend to clear server-side history for this coach ID.
- In a demo, you can: use hints on a few challenges → see them appear under Trainer History → click Reset coach history → confirm that local history is cleared and a backend reset call is made.

*Note: The extension auto-generates an anonymous coach ID (e.g. user-abc123) for backend sync. This ID is shown only in Trainer mode and is used solely to identify this coach’s state in the backend.*
