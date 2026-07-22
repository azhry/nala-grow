## General
- Look at the configurations in ./.agents/config.md first before doing anything else
- Do one task at a time, don't switch context until you're done
- For every task, you must branch out from main
- Don't ask permission to commit, push, or open PRs. You are allowed to do that by default.

## Frontend implementation delegation

For UI/frontend tasks, spawn a dedicated frontend implementation subagent. It must:
- build new screens or revamp existing ones from supplied references;
- use meaningful demo display data when real data is absent;
- implement all reference interactions;
- visually verify desktop and mobile before handoff;
- commit, push, and open a PR