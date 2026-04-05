# 🧬 Organisms

Autonomous living agents for Claude Code. Create self-managing AI organisms that sense, adapt, grow, shrink, learn, and evolve.

## What is an organism?

An organism is a Claude Code session that behaves like a living system:

- **Senses** its environment (APIs, files, databases)
- **Adapts** its rhythm (speeds up when active, slows down when quiet)
- **Grows** new agents when overwhelmed
- **Shrinks** by absorbing idle agents
- **Learns** from every cycle (accumulates knowledge permanently)
- **Evolves** by rewriting its own behavior when strategies fail
- **Survives** crashes via session resume

Zero custom code. Just markdown and Claude Code native features.

## Quick Start

```bash
# 1. Clone
git clone https://github.com/jfikrat/organisms.git ~/.organisms

# 2. Create an organism
cd ~/my-project
~/.organisms/init.sh "Watch crypto markets, track sigma levels, detect regime changes"

# 3. Start it
claude --dangerously-skip-permissions --init-prompt "Boot"
```

The organism will come alive — set up its own cron cycles, fetch data, observe, learn, and grow agents as needed.

## With Plugin Skills

For interactive control over your organism:

```bash
claude --dangerously-skip-permissions --plugin-dir ~/.organisms
```

This gives you:

| Skill | What it does |
|-------|-------------|
| `/organisms:init <mission>` | Create a new organism in the current directory |
| `/organisms:status` | Show vital signs — health, agents, cron, learning progress |
| `/organisms:grow <role>` | Spawn a new specialized agent |
| `/organisms:shrink [name]` | Remove an idle agent (merges its knowledge first) |
| `/organisms:evolve [concern]` | Trigger self-evaluation and adaptation |

## How It Works

Every organism has the same DNA (instincts) but a unique mission:

```
CLAUDE.md = mission + instincts + boot-sequence
  ├── <mission>     What this organism does (unique per organism)
  ├── <instincts>   Shared DNA — how to sense, grow, shrink, learn, evolve
  ├── <boot-sequence>  How to come alive on startup
  └── <conventions>    File naming and output rules
```

### Directory Structure

```
your-project/
├── CLAUDE.md              ← Brain (mission + DNA)
├── .tracking/
│   ├── status.md          ← Current state (overwritten each cycle)
│   ├── journal.md         ← Append-only observation log
│   └── priorities.md      ← Current focus (rewritten in daily review)
├── .learning/
│   ├── lessons.md         ← Validated insights (append-only, permanent)
│   ├── playbook.md        ← Successful patterns (append-only)
│   └── failures.md        ← What broke and why (append-only)
└── .claude/
    ├── agents/            ← Subagents (organism grows these itself)
    └── skills/            ← Custom skills (organism creates as needed)
```

### Lifecycle

```
BIRTH → Claude Code opens, reads CLAUDE.md
  │
BOOT → Sets up CronCreate jobs (heartbeat)
  │
OBSERVE → Periodic sensing cycle (e.g. every 5 min)
  │     Fetch data → compare with last state → journal if changed
  │     5x "no change" → slow down rhythm (adaptation)
  │     Big change → speed up rhythm, maybe spawn agent
  │
REVIEW → Daily self-evaluation
  │     Extract patterns → update .learning/
  │     Re-prioritize → what matters now?
  │     Agent audit → grow or shrink?
  │
GROWTH → When overwhelmed, spawn specialized agents
  │     Transfers knowledge from .learning/ (DNA copying)
  │     Agent works independently, reports back
  │
EVOLUTION → When strategies fail 3+ times
  │     Rewrites own behavior (mutates CLAUDE.md approach)
  │     Logs the mutation in .tracking/journal.md
  │
DEATH → User says "stop" or session ends
        .learning/ persists — knowledge survives death
        Next boot picks up where it left off
```

## Examples

```bash
# Market observer
organisms-init "ETH/BTC market structure observer. Track sigma, detect regime shifts."

# Project manager
organisms-init "Track JIRA tickets, daily standup summaries, deadline warnings."

# Content monitor
organisms-init "Watch Twitter mentions, summarize sentiment, alert on viral posts."

# Personal assistant
organisms-init "Morning briefing, calendar review, reminder management."

# DevOps monitor
organisms-init "Watch deploy pipeline, alert on failures, track error rates."
```

## Requirements

- [Claude Code](https://claude.com/code) v2.1.72+
- Claude Max or API key

## Philosophy

Organisms are not frameworks — they are a pattern. The entire system is markdown instructions that Claude Code interprets. No runtime, no dependencies, no build step.

The organism's intelligence comes from Claude. The pattern just gives it:
- A reason to wake up (CronCreate)
- A place to remember (.learning/)
- Permission to grow (agent spawning instincts)
- A nudge to improve (daily review + evolution instincts)

Everything else emerges.

## License

MIT
