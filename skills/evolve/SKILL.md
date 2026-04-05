---
name: evolve
description: "Trigger self-evaluation and adaptation. The organism reviews its effectiveness and mutates its behavior. Usage: /organisms:evolve or /organisms:evolve <specific concern>"
---

# Evolve — Self-Adaptation

Concern: "$ARGUMENTS" (if empty, do a general health review)

## Steps

1. Read .learning/lessons.md, .learning/failures.md, .learning/playbook.md
2. Read .tracking/journal.md — last 20 entries
3. Read .tracking/priorities.md — current queue

4. Evaluate:
   - What worked well? (patterns from playbook)
   - What failed? (patterns from failures)
   - What's stuck? (old priorities that never progress)
   - Are cron intervals appropriate? (too fast = wasteful, too slow = missing signals)
   - Are agents effective? (producing results, or idle?)

5. Mutate (make concrete changes):
   - Adjust CronCreate intervals if needed (CronDelete old + CronCreate new)
   - Rewrite underperforming agent .claude/agents/*.md files
   - Re-prioritize .tracking/priorities.md
   - Add new lessons to .learning/lessons.md
   - If a strategy failed 3+ times → fundamentally change approach, document why

6. Report what changed and why — be honest about what isn't working

## Important
- Evolution is expensive (reads many files, makes decisions). Don't evolve more than once per day.
- Every mutation must be logged in .tracking/journal.md
- Never delete .learning/ entries — only add. Memory is permanent.
