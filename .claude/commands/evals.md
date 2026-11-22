---
description: Run the AI evals and summarise regressions (available from MVP 2, ticket M2 eval runner).
---

Run `pnpm ai:evals`. If the script does not exist yet, say that the eval runner has not been built (requirements §9.8, MVP 2) and stop.

Otherwise summarise: exact assertions passed / failed (must be 100%), rubric score vs the stored baseline (must be within 5%), and each regressed case with the conversation, expected behaviour and what the AI did instead. Do not edit prompts or baselines unless I ask.
