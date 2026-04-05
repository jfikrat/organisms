# Organisms

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

## Installation

```bash
# Clone
git clone https://github.com/jfikrat/organisms.git ~/.organisms

# Symlink the CLI
ln -s ~/.organisms/src/cli.ts ~/bin/organisms
```

Or, if you prefer `bun link`:

```bash
git clone https://github.com/jfikrat/organisms.git ~/.organisms
cd ~/.organisms
bun link
```

## Usage

```bash
# Create an organism
cd ~/my-project
organisms init "Watch crypto markets, track sigma levels, detect regime changes"

# Start it (runs in tmux)
organisms start

# Attach to see what it's doing
organisms attach

# Check vital signs
organisms status

# Tail the journal
organisms logs -f

# Spawn a new agent
organisms grow "data analyst for SQL queries"

# Remove an agent
organisms shrink analyst

# Trigger self-evaluation
organisms evolve "watcher cycle is too slow"

# Stop
organisms stop
```

## Commands

| Command | Description |
|---------|-------------|
| `organisms init <mission>` | Create a new organism in the current directory |
| `organisms start` | Start the organism (opens Claude Code in tmux) |
| `organisms stop` | Stop the running organism |
| `organisms status` | Show vital signs |
| `organisms list` | List all organisms on this machine |
| `organisms grow <role>` | Spawn a new agent |
| `organisms shrink [name]` | Remove an idle agent |
| `organisms evolve [concern]` | Trigger self-evaluation and adaptation |
| `organisms attach` | Attach to the running organism's terminal |
| `organisms logs [-f]` | Show recent journal entries (-f to follow) |

## How It Works

Every organism has the same DNA (instincts) but a unique mission:

```
CLAUDE.md = mission + invariants + instincts + boot-sequence
  +-- <mission>       What this organism does (unique per organism)
  +-- <invariants>    Immutable safety constraints (never modified)
  +-- <instincts>     Shared DNA -- how to sense, grow, shrink, learn, evolve
  +-- <boot-sequence> How to come alive on startup
  +-- <conventions>   File naming and output rules
```

### Directory Structure

```
your-project/
+-- CLAUDE.md              <- Brain (mission + DNA)
+-- .tracking/
|   +-- status.md          <- Current state (overwritten each cycle)
|   +-- journal.md         <- Append-only observation log
|   +-- priorities.md      <- Current focus (rewritten in daily review)
+-- .learning/
|   +-- lessons.md         <- Validated insights (append-only, permanent)
|   +-- playbook.md        <- Successful patterns (append-only)
|   +-- failures.md        <- What broke and why (append-only)
+-- .claude/
    +-- settings.json      <- Permissions + safety hooks
    +-- agents/            <- Subagents (organism grows these itself)
    +-- skills/            <- Custom skills (organism creates as needed)
```

## Safety

Organisms ship with multiple safety layers:

### Invariants

Every organism's CLAUDE.md contains an `<invariants>` block with immutable rules:

- Cannot modify its own mission or invariants
- Cannot write files outside its project directory
- Cannot set cron faster than every 3 minutes
- Cannot spawn more than 3 agents simultaneously
- Cannot delete `.learning/` files (knowledge is permanent)
- Cannot exfiltrate data to external servers
- Cannot modify `.claude/settings.json`

### Permission Model

The generated `.claude/settings.json` includes:

- **Allow**: Bash, Read, Write, Edit, Glob, Grep, CronCreate, CronList, CronDelete, Agent
- **Deny**: Write to `~/.ssh/**`, `~/.aws/**`, `~/.env`, `~/.claude/settings.json`; `rm -rf /`

### Safety Hooks

A pre-tool-use hook checks Bash commands for destructive operations (`rm -rf`, `drop table`, `kill -9`) targeting files outside organism directories.

## Requirements

- [Claude Code](https://claude.com/code) v2.1.72+
- [Bun](https://bun.sh) runtime
- tmux (for background sessions)

## Philosophy

Organisms are not frameworks -- they are a pattern. The entire system is markdown instructions that Claude Code interprets. No runtime, no dependencies, no build step.

The organism's intelligence comes from Claude. The pattern just gives it:
- A reason to wake up (CronCreate)
- A place to remember (.learning/)
- Permission to grow (agent spawning instincts)
- A nudge to improve (daily review + evolution instincts)

Everything else emerges.

## License

MIT
