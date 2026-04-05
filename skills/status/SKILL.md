---
name: status
description: "Show the organism's vital signs: health, active agents, cron jobs, learning progress, recent activity"
---

# Organism Status Check

Read and report:

1. **Identity**: Read CLAUDE.md — extract mission
2. **Vitals**: Run CronList — show active jobs and their schedules
3. **Agents**: Check .claude/agents/ — list defined agents. For each, check if alive (tmux has-session or similar)
4. **Memory**: Count entries in .learning/lessons.md, .learning/playbook.md, .learning/failures.md
5. **Recent activity**: Last 5 lines of .tracking/journal.md
6. **Current state**: Read .tracking/status.md
7. **Queue**: Read .tracking/priorities.md — what's next

Format as a clean status board. Use emoji for quick scanning:
- 🟢 alive/active
- ⏸ paused/idle
- 📊 stats
- 🧠 learning count
- 📋 queue items
