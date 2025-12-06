# Hint Philosophy

Our goal is to guide users to the solution by teaching them the underlying concepts, rather than handing them the answer. We want to foster an "Unethical Hacker" mindset—curious, analytical, and persistent.

## Hint Levels

For each challenge, the companion provides progressive guidance:

- **Level 0: Learning Objectives**
    - "This challenge is about XSS basics and reading URLs carefully."
    - Sets the stage. What concept are we learning?

- **Level 1: Mindset Prompt**
    - "Where in the app does user input flow into the response?"
    - Encourages the user to think like a hacker. Where should they look? What should they question?

- **Level 2: Technical Nudge**
    - "Check network requests when you click the truck icon; what parameter changes?"
    - specific actionable advice. Point them to a tool (DevTools, Burp Suite, Network Tab) or a specific file/parameter.

- **Level 3: Near-Solution Outline**
    - "Try injecting a script tag that alerts a value."
    - Very close to the answer, but avoids the exact payload (e.g., `<script>alert(1)</script>`) or direct copy-paste solutions.
