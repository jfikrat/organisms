---
name: shrink
description: "Remove an idle or unnecessary agent. Usage: /organisms:shrink <agent-name> or /organisms:shrink (auto — removes least active)"
---

# Shrink — Remove Agent

Target: "$ARGUMENTS" (if empty, auto-detect least useful agent)

## Steps

1. List all agents in .claude/agents/
2. If specific name given → target that agent
3. If "auto" or empty → pick the agent with least recent activity
4. Before removing:
   - Read the agent's .md for any unique knowledge
   - Merge useful knowledge into organism's .learning/ (absorption)
   - Log the removal in .tracking/journal.md
5. Delete .claude/agents/{name}.md
6. Confirm: "Agent {name} absorbed. Knowledge merged into .learning/."
