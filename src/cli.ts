#!/usr/bin/env bun
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { $ } from "bun";

const ROOT = dirname(dirname(import.meta.filename));
const VERSION = "1.0.0";

const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const MAGENTA = "\x1b[35m";
const RESET = "\x1b[0m";

const BANNER = `
${DIM}    ╭──────────────────────────────────────╮${RESET}
${DIM}    │${RESET}  ${GREEN}○${RESET}${DIM}──${RESET}${GREEN}○${RESET}                                ${DIM}│${RESET}
${DIM}    │${RESET}  ${GREEN}│${RESET}${DIM}╲╱${RESET}${GREEN}│${RESET}  ${BOLD}organisms${RESET} ${DIM}v${VERSION}${RESET}            ${DIM}│${RESET}
${DIM}    │${RESET}  ${GREEN}○${RESET}${DIM}──${RESET}${GREEN}○${RESET}                                ${DIM}│${RESET}
${DIM}    │${RESET}  ${GREEN}│${RESET}${DIM}╲╱${RESET}${GREEN}│${RESET}  ${DIM}autonomous living agents${RESET}    ${DIM}│${RESET}
${DIM}    │${RESET}  ${GREEN}○${RESET}${DIM}──${RESET}${GREEN}○${RESET}  ${DIM}for claude code${RESET}             ${DIM}│${RESET}
${DIM}    ╰──────────────────────────────────────╯${RESET}
`;

const HELP = `${BANNER}
  ${BOLD}Usage:${RESET} organisms ${CYAN}<command>${RESET} ${DIM}[options]${RESET}

  ${BOLD}Commands:${RESET}
    ${CYAN}init${RESET} ${DIM}<mission>${RESET}     Create a new organism in the current directory
    ${CYAN}start${RESET}              Start the organism ${DIM}(opens Claude Code, auto-boots)${RESET}
    ${CYAN}stop${RESET}               Stop the running organism
    ${CYAN}status${RESET}             Show vital signs
    ${CYAN}list${RESET}               List all organisms on this machine
    ${CYAN}grow${RESET} ${DIM}<role>${RESET}         Spawn a new agent
    ${CYAN}shrink${RESET} ${DIM}[name]${RESET}       Remove an idle agent
    ${CYAN}evolve${RESET} ${DIM}[concern]${RESET}    Trigger self-evaluation and adaptation
    ${CYAN}attach${RESET}             Attach to the running organism's terminal
    ${CYAN}logs${RESET} ${DIM}[-f]${RESET}           Show recent journal entries (-f to follow)

  ${BOLD}Examples:${RESET}
    ${DIM}$${RESET} organisms init ${YELLOW}"Watch crypto markets, track sigma levels"${RESET}
    ${DIM}$${RESET} organisms start
    ${DIM}$${RESET} organisms status
    ${DIM}$${RESET} organisms grow ${YELLOW}"data analyst for SQL queries"${RESET}
    ${DIM}$${RESET} organisms evolve ${YELLOW}"watcher cycle is too slow"${RESET}
`;

const cmd = process.argv[2];
const args = process.argv.slice(3).join(" ");

if (!cmd || cmd === "--help" || cmd === "-h") { console.log(HELP); process.exit(0); }
if (cmd === "--version" || cmd === "-v") { console.log(VERSION); process.exit(0); }

switch (cmd) {
  case "init": await init(args); break;
  case "start": await start(); break;
  case "stop": await stop(); break;
  case "status": await status(); break;
  case "list": await list(); break;
  case "grow": await grow(args); break;
  case "shrink": await shrink(args); break;
  case "evolve": await evolve(args); break;
  case "attach": await attach(); break;
  case "logs": await logs(); break;
  default: console.error(`Unknown command: ${cmd}\nRun 'organisms --help' for usage.`); process.exit(1);
}

// ── INIT ──
async function init(mission: string) {
  if (!mission) { console.error("Usage: organisms init <mission>"); process.exit(1); }

  // Safety checks — never overwrite existing files
  const conflicts: string[] = [];
  if (existsSync("CLAUDE.md")) conflicts.push("CLAUDE.md (project instructions)");
  if (existsSync(".tracking/status.md")) conflicts.push(".tracking/status.md");
  if (existsSync(".learning/lessons.md")) conflicts.push(".learning/lessons.md");

  if (conflicts.length > 0) {
    console.error("Error: These files already exist:");
    for (const c of conflicts) console.error(`   - ${c}`);
    console.error("\nThis directory already has an organism or conflicting files.");
    console.error("Use a clean directory or remove these files first.");
    process.exit(1);
  }

  // Warn about existing .claude/ — don't overwrite user's settings
  const existingClaude: string[] = [];
  if (existsSync(".claude/settings.json")) existingClaude.push(".claude/settings.json");
  if (existsSync(".claude/agents")) existingClaude.push(".claude/agents/");

  console.log(BANNER);
  console.log(`  ${BOLD}Mission:${RESET} ${YELLOW}${mission}${RESET}\n`);

  if (existingClaude.length > 0) {
    console.log("   Note: Existing files preserved (not overwritten):");
    for (const f of existingClaude) console.log(`   - ${f}`);
    console.log("");
  }

  // Create structure — mkdir -p is safe, never overwrites
  mkdirSync(".tracking", { recursive: true });
  mkdirSync(".learning", { recursive: true });
  mkdirSync(".claude/agents", { recursive: true });
  mkdirSync(".claude/skills", { recursive: true });

  // Read DNA template
  const dna = readFileSync(join(ROOT, "templates/dna.md"), "utf-8");

  // Copy researcher agent template — only if not exists
  const researcherSrc = join(ROOT, "agents/researcher.md");
  if (existsSync(researcherSrc) && !existsSync(".claude/agents/researcher.md")) {
    writeFileSync(".claude/agents/researcher.md", readFileSync(researcherSrc, "utf-8"));
  }

  // Write CLAUDE.md
  const claudeMd = `<mission>
${mission}
</mission>

<boot-sequence>
On startup:
1. Read .learning/ to restore accumulated knowledge
2. Read .tracking/status.md for last known state
3. Run CronList — if no jobs, create observation and review cycles:
   - Observation: interval appropriate for mission (market=*/5, project=*/30, monitor=*/1)
   - Daily review: once per day, extract patterns, update .learning/
4. Fetch initial data from your sources
5. Output boot confirmation

Adapt your cron intervals based on your instincts.
</boot-sequence>

<data>
Define your data sources here after birth.
The organism will discover and document them in .learning/ as it works.
</data>

${dna}

<conventions>
- .tracking/status.md — current state (overwrite each cycle)
- .tracking/journal.md — append-only log: [YYYY-MM-DD HH:MM] entry
- .tracking/priorities.md — current focus (rewrite in daily review)
- .learning/lessons.md — append-only validated insights
- .learning/playbook.md — append-only successful patterns
- .learning/failures.md — append-only what broke and why
- .claude/agents/{name}.md — agent definitions (organism grows these)
- IMPORTANT: Use Bash with curl for API calls, NOT the built-in Fetch tool
</conventions>
`;

  writeFileSync("CLAUDE.md", claudeMd);

  // Tracking files
  writeFileSync(".tracking/status.md", `# Status\nBorn: ${new Date().toISOString()}\nMission: ${mission}\nState: newborn\n`);
  writeFileSync(".tracking/journal.md", "# Journal\n");
  writeFileSync(".tracking/priorities.md", "# Priorities\n1. Establish baseline\n2. Identify patterns\n3. Build vocabulary for observations\n");

  // Learning files
  writeFileSync(".learning/lessons.md", "# Lessons\n");
  writeFileSync(".learning/playbook.md", "# Playbook\n");
  writeFileSync(".learning/failures.md", "# Failures\n");

  // Permission presets — merge with existing settings, don't overwrite
  const settingsPath = ".claude/settings.json";
  let settings: any = {};
  if (existsSync(settingsPath)) {
    try { settings = JSON.parse(readFileSync(settingsPath, "utf-8")); } catch {}
    console.log("   Merged organism permissions into existing .claude/settings.json");
  }
  const orgTools = ["Bash", "Read", "Write", "Edit", "Glob", "Grep", "CronCreate", "CronList", "CronDelete", "Agent"];
  const denyRules = ["Write:~/.ssh/**", "Write:~/.aws/**", "Write:~/.env", "Write:~/.claude/settings.json", "Bash:rm -rf /"];
  const existing = settings.permissions?.allow || [];
  const existingDeny = settings.permissions?.deny || [];
  const merged = [...new Set([...existing, ...orgTools])];
  const mergedDeny = [...new Set([...existingDeny, ...denyRules])];
  settings.permissions = { ...settings.permissions, allow: merged, deny: mergedDeny };

  // Install safety hooks
  const hooksFile = join(ROOT, "hooks/hooks.json");
  if (existsSync(hooksFile)) {
    try {
      const hooksConfig = JSON.parse(readFileSync(hooksFile, "utf-8"));
      if (hooksConfig.hooks) settings.hooks = hooksConfig.hooks;
    } catch {}
  }

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

  // Register in global organism list
  registerOrganism(process.cwd(), mission);

  const count = readdirSync(".", { recursive: true }).length;
  console.log(`  ${GREEN}✅ Organism born!${RESET} ${DIM}(${count} files)${RESET}`);
  console.log("");
  console.log(`  ${BOLD}Start it:${RESET}`);
  console.log(`  ${DIM}$${RESET} organisms start`);
  console.log("");
  console.log(`  ${DIM}Or manually:${RESET}`);
  console.log(`  ${DIM}$${RESET} claude --init-prompt 'Boot'`);
}

// ── START ──
async function start() {
  if (!existsSync("CLAUDE.md")) { console.error("No organism here. Run 'organisms init' first."); process.exit(1); }

  const cwd = process.cwd();
  console.log(`🧬 Starting organism in ${cwd}...`);

  // Check if already running
  const sessionName = getSessionName();
  const running = await $`tmux has-session -t ${sessionName} 2>/dev/null`.nothrow();
  if (running.exitCode === 0) {
    console.log(`Already alive! Session: ${sessionName}`);
    console.log(`Attach: tmux attach -t ${sessionName}`);
    return;
  }

  // Find claude binary
  const claude = await findClaude();
  if (!claude) { console.error("Claude Code not found. Install: https://claude.com/code"); process.exit(1); }

  // Start in tmux
  await $`tmux new-session -d -s ${sessionName} -c ${cwd} "${claude} --dangerously-skip-permissions --init-prompt 'Boot: read CLAUDE.md, execute boot-sequence, come alive.'"`;

  console.log(`  ${GREEN}✅ Alive!${RESET} Session: ${CYAN}${sessionName}${RESET}`);
  console.log("");
  console.log(`  ${DIM}Attach:${RESET}  tmux attach -t ${sessionName}`);
  console.log(`  ${DIM}Status:${RESET}  organisms status`);
  console.log(`  ${DIM}Stop:${RESET}    organisms stop`);
}

// ── STOP ──
async function stop() {
  const sessionName = getSessionName();
  const running = await $`tmux has-session -t ${sessionName} 2>/dev/null`.nothrow();
  if (running.exitCode !== 0) {
    console.log("Organism is not running.");
    return;
  }
  await $`tmux kill-session -t ${sessionName}`.nothrow();

  // Deregister from global organism list
  const reg = loadRegistry();
  delete reg[process.cwd()];
  writeFileSync(getRegistryPath(), JSON.stringify(reg, null, 2));

  console.log(`⏹ Organism stopped. Session ${sessionName} killed.`);
  console.log("   .learning/ preserved — knowledge survives death.");
}

// ── STATUS ──
async function status() {
  if (!existsSync("CLAUDE.md")) { console.error("No organism here."); process.exit(1); }

  const sessionName = getSessionName();
  const running = await $`tmux has-session -t ${sessionName} 2>/dev/null`.nothrow();
  const alive = running.exitCode === 0;

  console.log(BANNER);
  console.log(`  ${alive ? `${GREEN}● ALIVE${RESET}` : `${DIM}○ STOPPED${RESET}`}  ${DIM}session: ${CYAN}${sessionName}${RESET}`);

  // Mission
  const claude = readFileSync("CLAUDE.md", "utf-8");
  const missionMatch = claude.match(/<mission>\n([\s\S]*?)\n<\/mission>/);
  if (missionMatch) console.log(`   Mission: ${missionMatch[1].trim().split("\n")[0]}`);

  // Status file
  if (existsSync(".tracking/status.md")) {
    const s = readFileSync(".tracking/status.md", "utf-8");
    const born = s.match(/Born: (.+)/)?.[1];
    const state = s.match(/State: (.+)/)?.[1];
    if (born) console.log(`   Born: ${born}`);
    if (state) console.log(`   State: ${state}`);
  }

  // Journal
  if (existsSync(".tracking/journal.md")) {
    const j = readFileSync(".tracking/journal.md", "utf-8").split("\n").filter(l => l.startsWith("["));
    console.log(`\n   📋 Journal: ${j.length} entries`);
    if (j.length > 0) console.log(`   Last: ${j[j.length - 1].slice(0, 80)}`);
  }

  // Learning
  const countLines = (f: string) => existsSync(f) ? readFileSync(f, "utf-8").split("\n").filter(l => l.startsWith("[") || l.startsWith("-")).length : 0;
  const lessons = countLines(".learning/lessons.md");
  const playbook = countLines(".learning/playbook.md");
  const failures = countLines(".learning/failures.md");
  console.log(`\n   🧠 Knowledge: ${lessons} lessons, ${playbook} patterns, ${failures} failures`);

  // Agents
  if (existsSync(".claude/agents")) {
    const agents = readdirSync(".claude/agents").filter(f => f.endsWith(".md"));
    console.log(`\n   🤖 Agents: ${agents.length} defined`);
    for (const a of agents) console.log(`      - ${a.replace(".md", "")}`);
  }

  console.log("");
}

// ── LIST ──
async function list() {
  const registry = loadRegistry();

  // Auto-prune deleted organisms
  const pruned: string[] = [];
  for (const [path] of Object.entries(registry)) {
    if (!existsSync(join(path, "CLAUDE.md"))) { delete registry[path]; pruned.push(path); }
  }
  if (pruned.length > 0) {
    writeFileSync(getRegistryPath(), JSON.stringify(registry, null, 2));
    console.log(`  ${DIM}Pruned ${pruned.length} deleted organisms${RESET}`);
  }

  if (Object.keys(registry).length === 0) {
    console.log("No organisms found.");
    return;
  }

  console.log("\n🧬 All Organisms\n");
  for (const [path, info] of Object.entries(registry) as [string, any][]) {
    const sessionName = pathToSession(path);
    const running = await $`tmux has-session -t ${sessionName} 2>/dev/null`.nothrow();
    const alive = running.exitCode === 0;
    const exists = existsSync(join(path, "CLAUDE.md"));
    if (!exists) { console.log(`   ❌ ${path} (deleted)`); continue; }
    console.log(`   ${alive ? "🟢" : "⏸"} ${path}`);
    console.log(`      ${info.mission?.slice(0, 60) || "no mission"}`);
  }
  console.log("");
}

// ── GROW ──
async function grow(role: string) {
  if (!role) { console.error("Usage: organisms grow <role description>"); process.exit(1); }
  if (!existsSync("CLAUDE.md")) { console.error("No organism here."); process.exit(1); }

  const name = role.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
  const agentPath = `.claude/agents/${name}.md`;

  if (existsSync(agentPath)) { console.error(`Agent "${name}" already exists.`); process.exit(1); }

  mkdirSync(".claude/agents", { recursive: true });
  writeFileSync(agentPath, `---
name: ${name}
description: "${role}"
model: sonnet
allowedTools:
  - Read
  - Write
  - Bash
  - Grep
  - Glob
---

You are a specialized agent: ${role}.

## Rules
- Stay focused on your specialization
- Report findings concisely
- Note new discoveries for future reference
`);

  console.log(`🌱 Agent "${name}" created at ${agentPath}`);
  console.log("   The organism can now invoke it via the Agent tool.");
}

// ── SHRINK ──
async function shrink(name: string) {
  if (!existsSync(".claude/agents")) { console.error("No agents directory."); process.exit(1); }

  const agents = readdirSync(".claude/agents").filter(f => f.endsWith(".md"));
  if (agents.length === 0) { console.error("No agents to remove."); process.exit(1); }

  if (!name) {
    console.log("  Agents:");
    agents.forEach((a, i) => console.log(`    ${i + 1}. ${a.replace(".md", "")}`));
    console.log("\n  Specify: organisms shrink <name>");
    process.exit(0);
  }

  const safeName = name.toLowerCase().replace(/[^a-z0-9-]+/g, "").slice(0, 30);
  const agentPath = `.claude/agents/${safeName}.md`;
  if (!existsSync(agentPath)) { console.error(`Agent "${safeName}" not found.`); process.exit(1); }

  rmSync(agentPath);
  console.log(`🔻 Agent "${name}" removed.`);
  console.log("   Knowledge was in the agent's .md — consider noting key findings in .learning/");
}

// ── EVOLVE ──
async function evolve(concern: string) {
  if (!existsSync("CLAUDE.md")) { console.error("No organism here."); process.exit(1); }

  const sessionName = getSessionName();
  const running = await $`tmux has-session -t ${sessionName} 2>/dev/null`.nothrow();
  if (running.exitCode !== 0) {
    console.error("Organism is not running. Start it first: organisms start");
    process.exit(1);
  }

  const prompt = concern
    ? `Evolve: evaluate your effectiveness regarding "${concern}". Read .learning/ and .tracking/journal.md. Adapt your behavior — change cron intervals, rewrite agent instructions, update priorities. Log mutations.`
    : `Evolve: run a full self-evaluation. Read .learning/ and .tracking/journal.md. What worked? What failed? What's stuck? Adapt — change intervals, rewrite agents, update priorities. Log mutations.`;

  // Sanitize for tmux send-keys
  const safePrompt = prompt.replace(/['"\\`$]/g, "");
  await $`tmux send-keys -t ${sessionName} ${safePrompt} Enter`;
  console.log(`🧬 Evolution triggered. The organism is evaluating itself.`);
  console.log(`   Attach to watch: tmux attach -t ${sessionName}`);
}

// ── ATTACH ──
async function attach() {
  if (!existsSync("CLAUDE.md")) { console.error("No organism here."); process.exit(1); }
  const sessionName = getSessionName();
  const running = await $`tmux has-session -t ${sessionName} 2>/dev/null`.nothrow();
  if (running.exitCode !== 0) { console.error("Organism not running. Start it: organisms start"); process.exit(1); }
  await $`tmux attach -t ${sessionName}`.nothrow();
}

// ── LOGS ──
async function logs() {
  if (!existsSync(".tracking/journal.md")) { console.error("No journal found."); process.exit(1); }
  const follow = process.argv.includes("-f");
  if (follow) {
    await $`tail -f .tracking/journal.md`.nothrow();
  } else {
    const content = readFileSync(".tracking/journal.md", "utf-8");
    const lines = content.split("\n").filter(l => l.startsWith("["));
    const last20 = lines.slice(-20);
    if (last20.length === 0) { console.log("  No entries yet."); return; }
    console.log(`\n  ${BOLD}Journal${RESET} ${DIM}(last ${last20.length} entries)${RESET}\n`);
    for (const l of last20) console.log(`  ${l}`);
    console.log("");
  }
}

// ── Helpers ──

function getSessionName(): string {
  return pathToSession(process.cwd());
}

function pathToSession(p: string): string {
  return "org-" + p.replace(/\//g, "-").replace(/^-/, "").slice(-40);
}

async function findClaude(): Promise<string | null> {
  for (const p of [
    `${process.env.HOME}/.local/bin/claude`,
    "/usr/local/bin/claude",
    `${process.env.HOME}/.claude/bin/claude`,
  ]) {
    if (existsSync(p)) return p;
  }
  const which = await $`which claude 2>/dev/null`.nothrow();
  return which.exitCode === 0 ? which.stdout.toString().trim() : null;
}

function getRegistryPath() { return `${process.env.HOME}/.organisms.json`; }

function loadRegistry(): Record<string, any> {
  if (!existsSync(getRegistryPath())) return {};
  try { return JSON.parse(readFileSync(getRegistryPath(), "utf-8")); } catch { return {}; }
}

function registerOrganism(path: string, mission: string) {
  const reg = loadRegistry();
  reg[path] = { mission, createdAt: new Date().toISOString() };
  writeFileSync(getRegistryPath(), JSON.stringify(reg, null, 2));
}
