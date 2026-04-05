---
name: init
description: "Initialize a new organism in the current directory. Give it a mission and it comes alive. Usage: /organisms:init <mission description>"
---

# Initialize Organism

The user wants to create a new living organism in the current directory.
Their mission description is: "$ARGUMENTS"

## Steps

1. Read the DNA template from the plugin's templates/dna.md (use Glob to find it in plugin directories, or read from ~/.claude/plugins/*/organisms/templates/dna.md)

2. Create the directory structure:
   ```
   .tracking/          — status, journal, priorities
   .learning/          — accumulated knowledge, lessons, failures, playbook
   .claude/agents/     — subagent definitions (start empty, organism grows its own)
   .claude/skills/     — project-specific skills (start empty, organism creates as needed)
   ```

3. Write CLAUDE.md at project root with:
   - A <mission> block based on the user's description
   - The full <instincts> block from the DNA template
   - A <boot-sequence> that sets up initial CronCreate jobs appropriate for the mission
   - A <data> block — ask the user what data sources are relevant (APIs, databases, files)
   - A <conventions> block with file naming and output rules

4. Write initial tracking files:
   - .tracking/status.md — "Just born. Mission: {mission}. No observations yet."
   - .tracking/journal.md — empty log
   - .tracking/priorities.md — initial priorities based on mission
   - .learning/lessons.md — empty
   - .learning/playbook.md — empty
   - .learning/failures.md — empty

5. Output a birth announcement:
   - What the organism's mission is
   - What cron jobs it will set up on first boot
   - How to start it: "Open Claude Code in this directory and I'll come alive"
   - Remind: the organism will grow its own agents as needed

## Important
- The organism should be MINIMAL at birth. Don't create agents yet — it will grow them when needed.
- The CLAUDE.md should be self-contained. Anyone opening Claude Code in this directory should understand what this organism does.
- Adapt the boot-sequence cron intervals to the mission (fast market → */3, slow project → */30)
