# Antigravity Agent Guidelines & Workflow Rules

This project is configured with the **Roo Code + GSD + Ralph Loop + CodeRabbit** agentic framework.

---

## 1. Roo Code Operational Modes
When operating in this workspace, adapt your behavior based on the user's intent or specified mode:
- **Architect Mode**: Focus strictly on system design, architecture blueprints, data contracts, and implementation plans. Do not make speculative code changes.
- **Code Mode**: Direct full-stack implementation, writing clean, modular code, and maintaining documentation integrity.
- **Debug Mode**: Isolate root causes methodically. Reproduce bugs, analyze stack traces, inspect logs, and test fixes with regression tests.

---

## 2. GSD (Get Shit Done) Spec-Driven Workflow
To prevent context rot and maintain high output quality on multi-step tasks:
1. **Spec & Research**: Inspect existing files, dependencies, and requirements before writing code.
2. **Atomic Planning**: Break complex features into small, testable chunks.
3. **Execution**: Implement one discrete unit at a time.
4. **Verification**: Verify each step using linters, build commands, or automated tests before moving forward.

---

## 3. Ralph Loop Autonomous Completion Rule
- **No Early Bailing**: Do not stop halfway through a feature or ask the user to complete basic boilerplate.
- **Verification Gates**: Loop autonomously through implementation, testing, and error-fixing until all tasks in the plan pass.
- Use the `/goal` command or autonomous iterations to ensure continuous execution until the acceptance criteria are met.

---

## 4. CodeRabbit Review Standard
Before concluding any implementation turn, perform a self-review of changes:
- **Security**: Check for injection risks, exposed credentials, missing authentication/authorization checks.
- **Correctness & Edge Cases**: Validate error handling, null/undefined checks, and boundary values.
- **Performance**: Watch for N+1 queries, unindexed lookups, or unbounded memory growth.
- **Cleanliness**: Ensure proper formatting, typing, and no unintended dead code or debug artifacts.
