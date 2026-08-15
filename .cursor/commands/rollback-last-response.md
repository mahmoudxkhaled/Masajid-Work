# rollback-last-response

Roll back **only the changes you made in your last response/message**.

Restore all modified files to exactly how they were **before your previous action**, and do not change or undo anything from earlier messages.

First identify the files and edits introduced by your immediately previous response, then revert only those changes.

---

## Goal

Undo **only** the immediately previous assistant turn. Leave all earlier work in this conversation (and all unrelated local changes) untouched.

---

## STRICT RULES

### 1. Scope is the last assistant response only

- Identify files created, modified, renamed, or deleted **in the immediately previous assistant response**.
- Revert **only** those files / those edits.
- **Do not** undo work from earlier messages in this chat.
- **Do not** revert unrelated uncommitted changes, other features, or files you did not touch in that last turn.

### 2. Identify first, then revert

1. Recreate the file list from the last assistant turn (tool calls, writes, patches, deletes, git operations).
2. For each file:
   - **Edited in that turn only** → restore the pre-turn content (git history, conversation snapshots, or the last known good version from before that response).
   - **Created in that turn** → delete the new file.
   - **Deleted in that turn** → restore the deleted file.
   - **Renamed in that turn** → restore the original path and content.
3. If a file also had earlier edits in this chat, restore it to the state **after those earlier edits** and **before** the last response — not to `HEAD` or an older commit if that would wipe earlier in-chat work.

### 3. Do not over-revert

- Do **not** run broad git commands that reset the whole working tree (`git reset --hard`, `git checkout .`, `git restore .`, `git clean -fd`) unless every dirty file was introduced in that last response.
- Prefer **file-scoped** restore/delete.
- Do **not** commit, stash, or push as part of this command.

### 4. If there is nothing to roll back

- If the last assistant response made **no** file changes, say so and stop.
- Do **not** invent a rollback.

---

## Checklist

- [ ] Listed every file touched in the immediately previous assistant response.
- [ ] Reverted only those files to the pre-last-response state.
- [ ] Left earlier conversation edits and unrelated local changes intact.
- [ ] Did not use a whole-tree git reset unless the last turn owned every dirty file.
