---
name: Upstream syncing
description: Preserve local Replit setup when bringing in changes from GitHub.
---

Preserve the local Git history and working Replit runtime configuration when syncing upstream code; do not reset the workspace to the remote branch.

**Why:** The imported snapshot and GitHub had no common ancestor even after removing the shallow-history boundary. The upstream run settings also differed from the working preview configuration.

**How to apply:** Inspect ancestry and incoming configuration changes before pulling. Retain compatible preview settings while merging the requested upstream changes, and verify the running app afterward.
