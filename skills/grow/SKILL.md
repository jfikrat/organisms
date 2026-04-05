---
name: grow
description: "Spawn a new agent for the organism. Usage: /organisms:grow <role description>"
---

# Grow New Agent

The organism needs a new agent. Role description: "$ARGUMENTS"

## Steps

1. Generate a short kebab-case name from the role (e.g. "data analyst" → "data-analyst")

2. Write .claude/agents/{name}.md with:
   ```markdown
   ---
   name: {name}
   description: {role description}
   model: sonnet
   allowedTools:
     - Read
     - Write
     - Bash
     - Grep
     - Glob
   ---

   You are a specialized agent: {role description}.

   ## What you know
   (inherit relevant knowledge from the organism's .learning/)

   ## Rules
   - Stay focused on your specialization
   - Report findings concisely
   - Note new discoveries for future reference
   ```

3. Copy relevant knowledge from .learning/ into the agent's instructions

4. Confirm: "Agent {name} created. It will be available via the Agent tool. The organism's brain can invoke it when needed."

## Important
- Check .claude/agents/ first — don't create duplicates
- Check organism's instinct: max 3 agents of the same type
- The agent inherits knowledge but develops independently
