#!/usr/bin/env bash
# organisms init — create a new organism in the current directory
# Usage: organisms-init "mission description"
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
MISSION="${1:-}"

if [ -z "$MISSION" ]; then
  echo "Usage: organisms-init <mission>"
  echo ""
  echo "Examples:"
  echo "  organisms-init 'ETH/BTC market observer, sigma tracking, no trading'"
  echo "  organisms-init 'CGCD project manager, client deliverables, deadline tracking'"
  echo "  organisms-init 'Personal assistant, reminders, daily briefing'"
  exit 1
fi

if [ -f "CLAUDE.md" ]; then
  echo "Error: CLAUDE.md already exists. This directory already has an organism."
  exit 1
fi

echo "🧬 Creating organism..."
echo "   Mission: $MISSION"
echo ""

# Create structure
mkdir -p .tracking .learning .claude/agents .claude/skills

# Copy DNA template
DNA=$(cat "$SCRIPT_DIR/templates/dna.md")

# Write CLAUDE.md
cat > CLAUDE.md << BRAIN
<mission>
$MISSION
</mission>

<boot-sequence>
On startup:
1. Read .learning/ to restore accumulated knowledge
2. Read .tracking/status.md for last known state
3. Run CronList — if no jobs, create your observation and review cycles:
   - Observation cycle: appropriate interval for your mission (market = */5, project = */30)
   - Daily review: once per day, extract patterns, update .learning/
4. Fetch initial data from your sources
5. Output boot confirmation

Adapt your cron intervals based on your instincts — speed up when things change, slow down when quiet.
</boot-sequence>

<data>
Define your data sources here after birth.
The organism will discover and document them in .learning/ as it works.
</data>

$DNA

<conventions>
- .tracking/status.md — current state (overwrite each cycle)
- .tracking/journal.md — append-only observation log: [YYYY-MM-DD HH:MM] entry
- .tracking/priorities.md — current focus (rewrite in daily review)
- .learning/lessons.md — append-only validated insights
- .learning/playbook.md — append-only successful patterns
- .learning/failures.md — append-only what broke and why
- .claude/agents/{name}.md — agent definitions (organism grows these)
- IMPORTANT: Use Bash with curl for API calls, NOT the built-in Fetch tool
</conventions>
BRAIN

# Write tracking files
cat > .tracking/status.md << EOF
# Status
Born: $(date --iso-8601=seconds)
Mission: $MISSION
State: newborn — no observations yet
EOF

echo "# Journal" > .tracking/journal.md

cat > .tracking/priorities.md << EOF
# Priorities
1. Establish baseline — understand normal state
2. Identify patterns — what changes and when
3. Build vocabulary — consistent naming for observations
EOF

# Write learning files
echo "# Lessons" > .learning/lessons.md
echo "# Playbook" > .learning/playbook.md
echo "# Failures" > .learning/failures.md

# Copy plugin agents as templates (not active — organism grows its own)
if [ -d "$SCRIPT_DIR/agents" ]; then
  cp "$SCRIPT_DIR/agents/"*.md .claude/agents/ 2>/dev/null || true
fi

echo "✅ Organism born!"
echo ""
echo "   $(find . -type f | wc -l) files created"
echo ""
echo "   To start (auto-boot):"
echo "   claude --dangerously-skip-permissions --init-prompt 'Boot: read CLAUDE.md, set up CronCreate jobs, fetch initial data, confirm alive.'"
echo ""
echo "   With plugin skills:"
echo "   claude --dangerously-skip-permissions --plugin-dir $SCRIPT_DIR --init-prompt 'Boot: read CLAUDE.md, set up CronCreate jobs, fetch initial data, confirm alive.'"
echo ""
echo "   The organism will come alive immediately — no need to type anything."
