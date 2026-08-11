# ChatGPT project context

This directory is a local mirror of the ChatGPT project “NTTDATAハッカソン”.

- Treat every file under `sources/` as read-only reference material.
- Do not edit, rename, move, or delete synced project files.
- These files may be replaced the next time a task is created from this ChatGPT project.

## Project overview

This project is a proof-of-concept web app for “NTT DATA人口ブラックジャック”.

The current app is a static HTML/CSS/JavaScript MVP that uses Firebase Realtime Database through the Firebase Web SDK CDN. It is intended to validate two-player room-based gameplay before adding production data, authentication, hosting, and presentation polish.

## Development rules for Codex

- Preserve existing behavior unless the user explicitly asks to change it.
- Make changes in small, focused units.
- Do not edit files under `sources/`; treat them as reference material only.
- Keep Firebase project settings separated from application logic.
- Do not commit `.env`, secrets, Firebase private keys, service account files, or other credentials.
- Do not hard-code private Firebase credentials into documentation or source files.
- After making changes, run the most relevant checks available in this project.
- At minimum, run JavaScript syntax checks when `app.js` changes.
- When possible, verify that the local page still responds through the local server.
- After finishing work, review the changed files and summarize what changed.
- Use appropriate git commits for each coherent unit of work.
- Commit messages should be specific and describe the user-visible or project-level change.
- After GitHub is connected, push the current branch after completing a work unit.
- If `git commit` or `git push` fails, do not use force operations automatically.
- If push or commit fails, report the cause and ask before taking risky recovery steps.
- Do not run destructive git commands such as `git reset --hard`, forced checkout, or force push unless the user explicitly approves.

## Suggested checks

- `node --check app.js`
- Open the local page through a local server rather than double-clicking `index.html`.
- Confirm that Firebase errors are visible in the UI when configuration or rules are missing.

## Project instructions

This project has no additional custom instructions.
