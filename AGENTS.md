## General
Look at the configurations in ./.agents/config.md first before doing anything else

## Frontend implementation delegation

For UI/frontend tasks, spawn a dedicated frontend implementation subagent. It must:
- build new screens or revamp existing ones from supplied references;
- use meaningful demo display data when real data is absent;
- implement all reference interactions;
- visually verify desktop and mobile before handoff;
- commit, push, and open a PR