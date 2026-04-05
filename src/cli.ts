#!/usr/bin/env bun
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { $ } from "bun";

const ROOT = dirname(dirname(import.meta.filename));
const VERSION = "1.1.0";

// ── Colors ──
const R = "\x1b[0m";      // reset
const D = "\x1b[2m";      // dim
const B = "\x1b[1m";      // bold
const G = "\x1b[32m";     // green (life)
const BG = "\x1b[92m";    // bright green (alive)
const C = "\x1b[36m";     // cyan (data/bonds)
const BC = "\x1b[96m";    // bright cyan
const Y = "\x1b[33m";     // yellow/amber (warning/dormant)
const DR = "\x1b[2;31m";  // dim red (death)
const W = "\x1b[97m";     // bright white

// ── Visual Elements ──
const HELIX = `${G}      ◦${C}———${G}◦${R}
${D}       ╲ ╱${R}
${D}        ${C}╳${R}
${D}       ╱ ╲${R}
${G}     ◦${C}———${G}◦${R}
${D}      ╲ ╱${R}
${D}       ${C}╳${R}
${D}      ╱ ╲${R}
${G}    ◦${C}———${G}◦${R}`;

const HELIX_SMALL = `${G}◦${C}·${G}◦${R}`;
const ALIVE = `${BG}●${R}`;
const DORMANT = `${D}○${R}`;
const BIRTH = `${BG}◎${R}`;
const MEMBRANE = `${D}  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄${R}`;

const BANNER = `
${G}      ◦${C}———${G}◦${R}
${D}       ╲ ╱${R}
${D}        ${C}╳${R}       ${B}${W}organisms${R} ${D}v${VERSION}${R}
${D}       ╱ ╲${R}
${G}     ◦${C}———${G}◦${R}
${D}      ╲ ╱${R}       ${D}autonomous living agents${R}
${D}       ${C}╳${R}        ${D}for claude code${R}
${D}      ╱ ╲${R}
${G}    ◦${C}———${G}◦${R}
`;

const HELP = `${BANNER}
  ${B}usage${R}  organisms ${C}<command>${R} ${D}[options]${R}

  ${B}lifecycle${R}
    ${C}init${R} ${D}<mission>${R}     create a new organism
    ${C}start${R}              bring the organism to life
    ${C}stop${R}               let the organism rest ${D}(knowledge preserved)${R}
    ${C}attach${R}             enter the organism's mind
    ${C}logs${R} ${D}[-f]${R}           read the organism's journal

  ${B}observe${R}
    ${C}status${R}             vital signs
    ${C}list${R}               view the colony
    ${C}dash${R}               live colony dashboard
    ${C}web${R}                web dashboard ${D}(localhost:3333)${R}

  ${B}grow & evolve${R}
    ${C}grow${R} ${D}<role>${R}         spawn a new agent
    ${C}shrink${R} ${D}[name]${R}       absorb an idle agent
    ${C}evolve${R} ${D}[concern]${R}    trigger self-evaluation and mutation

  ${B}examples${R}
    ${D}$${R} organisms init ${Y}"market observer, track sigma levels"${R}
    ${D}$${R} organisms start
    ${D}$${R} organisms attach
    ${D}$${R} organisms grow ${Y}"data analyst for SQL queries"${R}
    ${D}$${R} organisms evolve ${Y}"observation cycle too slow"${R}
`;

// ── CLI Entry ──
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
  case "dashboard": case "dash": case "d": await import("./dashboard.ts"); break;
  case "web": await import("./web.ts"); break;
  default: console.error(`unknown command: ${cmd}\nrun 'organisms --help' for usage.`); process.exit(1);
}

// ── INIT (birth) ──
async function init(mission: string) {
  if (!mission) { console.error(`usage: organisms init ${D}<mission>${R}`); process.exit(1); }

  const conflicts: string[] = [];
  if (existsSync("CLAUDE.md")) conflicts.push("CLAUDE.md");
  if (existsSync(".tracking/status.md")) conflicts.push(".tracking/status.md");
  if (existsSync(".learning/lessons.md")) conflicts.push(".learning/lessons.md");
  if (conflicts.length > 0) {
    console.error(`\n  ${DR}an organism already lives here${R}`);
    for (const c of conflicts) console.error(`  ${D}  ${c}${R}`);
    process.exit(1);
  }

  const existingClaude: string[] = [];
  if (existsSync(".claude/settings.json")) existingClaude.push(".claude/settings.json");
  if (existsSync(".claude/agents")) existingClaude.push(".claude/agents/");

  // Birth animation
  console.log("");
  console.log(`${D}          ·${R}`);
  console.log(`${G}         ◦${C}·${G}◦${R}`);
  console.log(`${D}          ${C}╳${R}`);
  console.log(`${G}         ◦${C}·${G}◦${R}          ${BIRTH} ${B}birth${R}`);
  console.log(`${D}          ${C}╳${R}`);
  console.log(`${G}         ◦${C}·${G}◦${R}`);
  console.log("");
  console.log(MEMBRANE);
  console.log("");
  console.log(`  ${D}name${R}        ${B}${basename(process.cwd())}${R}`);
  console.log(`  ${D}mission${R}     ${Y}${mission}${R}`);
  console.log(`  ${D}genome${R}      ${D}CLAUDE.md${R}`);
  console.log(`  ${D}born${R}        ${D}${new Date().toISOString().slice(0, 19)}${R}`);

  if (existingClaude.length > 0) {
    console.log("");
    console.log(`  ${D}preserved${R}   ${existingClaude.join(", ")}`);
  }

  // Create structure
  mkdirSync(".tracking", { recursive: true });
  mkdirSync(".learning", { recursive: true });
  mkdirSync(".claude/agents", { recursive: true });
  mkdirSync(".claude/skills", { recursive: true });

  const dna = readFileSync(join(ROOT, "templates/dna.md"), "utf-8");

  const researcherSrc = join(ROOT, "agents/researcher.md");
  if (existsSync(researcherSrc) && !existsSync(".claude/agents/researcher.md")) {
    writeFileSync(".claude/agents/researcher.md", readFileSync(researcherSrc, "utf-8"));
  }

  writeFileSync("CLAUDE.md", `<mission>\n${mission}\n</mission>\n\n<boot-sequence>\nOn startup:\n1. Read .learning/ to restore accumulated knowledge\n2. Read .tracking/status.md for last known state\n3. Run CronList — if no jobs, create observation and review cycles:\n   - Observation: interval appropriate for mission (market=*/5, project=*/30, monitor=*/1)\n   - Daily review: once per day, extract patterns, update .learning/\n4. Fetch initial data from your sources\n5. Output boot confirmation\n\nAdapt your cron intervals based on your instincts.\n</boot-sequence>\n\n<data>\nDefine your data sources here after birth.\nThe organism will discover and document them in .learning/ as it works.\n</data>\n\n${dna}\n\n<conventions>\n- .tracking/status.md — current state (overwrite each cycle)\n- .tracking/journal.md — append-only log: [YYYY-MM-DD HH:MM] entry\n- .tracking/priorities.md — current focus (rewrite in daily review)\n- .learning/lessons.md — append-only validated insights\n- .learning/playbook.md — append-only successful patterns\n- .learning/failures.md — append-only what broke and why\n- .claude/agents/{name}.md — agent definitions (organism grows these)\n- IMPORTANT: Use Bash with curl for API calls, NOT the built-in Fetch tool\n</conventions>\n`);

  writeFileSync(".tracking/status.md", `# Status\nBorn: ${new Date().toISOString()}\nMission: ${mission}\nState: newborn\n`);
  writeFileSync(".tracking/journal.md", "# Journal\n");
  writeFileSync(".tracking/priorities.md", "# Priorities\n1. Establish baseline\n2. Identify patterns\n3. Build vocabulary for observations\n");
  writeFileSync(".learning/lessons.md", "# Lessons\n");
  writeFileSync(".learning/playbook.md", "# Playbook\n");
  writeFileSync(".learning/failures.md", "# Failures\n");

  const settingsPath = ".claude/settings.json";
  let settings: any = {};
  if (existsSync(settingsPath)) { try { settings = JSON.parse(readFileSync(settingsPath, "utf-8")); } catch {} }
  const orgTools = ["Bash", "Read", "Write", "Edit", "Glob", "Grep", "CronCreate", "CronList", "CronDelete", "Agent"];
  const denyRules = ["Write:~/.ssh/**", "Write:~/.aws/**", "Write:~/.env", "Write:~/.claude/settings.json", "Bash:rm -rf /"];
  settings.permissions = { allow: [...new Set([...(settings.permissions?.allow || []), ...orgTools])], deny: [...new Set([...(settings.permissions?.deny || []), ...denyRules])] };
  const hooksFile = join(ROOT, "hooks/hooks.json");
  if (existsSync(hooksFile)) { try { settings.hooks = JSON.parse(readFileSync(hooksFile, "utf-8")).hooks; } catch {} }
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

  registerOrganism(process.cwd(), mission);

  console.log("");
  console.log(`  ${D}first heartbeat${R}  organisms start`);
  console.log("");
}

// ── START (come alive) ──
async function start() {
  if (!existsSync("CLAUDE.md")) { console.error(`${D}no organism here. run${R} organisms init ${D}first.${R}`); process.exit(1); }
  const cwd = process.cwd();
  const sessionName = getSessionName();
  const running = await $`tmux has-session -t ${sessionName} 2>/dev/null`.nothrow();
  if (running.exitCode === 0) {
    console.log(`\n  ${ALIVE} ${B}already alive${R}  ${D}session: ${sessionName}${R}`);
    console.log(`  ${D}attach:${R} organisms attach\n`);
    return;
  }

  const claude = await findClaude();
  if (!claude) { console.error("claude code not found. install: https://claude.com/code"); process.exit(1); }

  await $`tmux new-session -d -s ${sessionName} -c ${cwd} "${claude} --dangerously-skip-permissions --init-prompt 'Boot: read CLAUDE.md, execute boot-sequence, come alive.'"`;

  console.log(`\n  ${ALIVE} ${BG}alive${R}  ${D}session: ${C}${sessionName}${R}`);
  console.log("");
  console.log(`  ${D}attach${R}   organisms attach`);
  console.log(`  ${D}status${R}   organisms status`);
  console.log(`  ${D}stop${R}     organisms stop`);
  console.log("");
}

// ── STOP (rest) ──
async function stop() {
  const sessionName = getSessionName();
  const running = await $`tmux has-session -t ${sessionName} 2>/dev/null`.nothrow();
  if (running.exitCode !== 0) { console.log(`\n  ${DORMANT} ${D}already at rest${R}\n`); return; }

  // Read stats before killing
  let thoughts = 0;
  let lived = "";
  if (existsSync(".tracking/journal.md")) {
    thoughts = readFileSync(".tracking/journal.md", "utf-8").split("\n").filter(l => l.startsWith("[")).length;
  }
  if (existsSync(".tracking/status.md")) {
    const born = readFileSync(".tracking/status.md", "utf-8").match(/Born: (.+)/)?.[1];
    if (born) {
      const ms = Date.now() - new Date(born).getTime();
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      lived = `${h}h ${m}m`;
    }
  }

  await $`tmux kill-session -t ${sessionName}`.nothrow();
  const reg = loadRegistry();
  delete reg[process.cwd()];
  writeFileSync(getRegistryPath(), JSON.stringify(reg, null, 2));

  console.log(`\n  ${D}${basename(process.cwd())}${R}`);
  console.log("");
  console.log(`${D}  ○${C}———${D}○${R}`);
  console.log(`${D}   ╲ ╱${R}`);
  console.log(`${D}    ╳${R}          ${D}final heartbeat recorded${R}`);
  console.log(`${D}   ╱ ╲${R}         ${D}thoughts:${R} ${thoughts}`);
  console.log(`${D}  ○${C}———${D}○${R}        ${D}lived:${R} ${lived || "unknown"}`);
  console.log("");
  console.log(`  ${D}journal preserved at .tracking/journal.md${R}`);
  console.log(`  ${D}knowledge preserved at .learning/${R}`);
  console.log("");
}

// ── STATUS (vital signs) ──
async function status() {
  if (!existsSync("CLAUDE.md")) { console.error(`${D}no organism here.${R}`); process.exit(1); }
  const sessionName = getSessionName();
  const running = await $`tmux has-session -t ${sessionName} 2>/dev/null`.nothrow();
  const alive = running.exitCode === 0;
  const name = basename(process.cwd());

  // Read mission
  const claudeMd = readFileSync("CLAUDE.md", "utf-8");
  const mission = claudeMd.match(/<mission>\n([\s\S]*?)\n<\/mission>/)?.[1]?.trim().split("\n")[0] || "";

  // Read status
  let born = "", state = "", lastHeartbeat = "";
  if (existsSync(".tracking/status.md")) {
    const s = readFileSync(".tracking/status.md", "utf-8");
    born = s.match(/Born: (.+)/)?.[1] || "";
    state = s.match(/State: (.+)/)?.[1] || "";
  }
  if (existsSync(".tracking/journal.md")) {
    const lines = readFileSync(".tracking/journal.md", "utf-8").split("\n").filter(l => l.startsWith("["));
    if (lines.length > 0) {
      const last = lines[lines.length - 1];
      lastHeartbeat = last.match(/\[(.+?)\]/)?.[1] || "";
    }
  }

  // Uptime
  let uptime = "";
  if (born) {
    const ms = Date.now() - new Date(born).getTime();
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    uptime = d > 0 ? `${d}d ${h}h` : `${h}h`;
  }

  console.log("");
  console.log(`  ${G}◦${C}———${G}◦${R}  ${B}${name}${R}                          ${alive ? `${ALIVE} ${BG}alive${R}` : `${DORMANT} ${Y}dormant${R}`}`);
  console.log(`  ${D} ╲ ╱${R}   ${D}${mission.slice(0, 45)}${R}${uptime ? `          ${D}uptime ${BC}${uptime}${R}` : ""}`);
  console.log(`  ${D}  ${C}╳${R}`);
  console.log(`  ${D} ╱ ╲${R}   ${D}heartbeat${R}   ${lastHeartbeat ? `${BC}${lastHeartbeat}${R}` : `${D}—${R}`}`);
  console.log(`  ${G}◦${C}———${G}◦${R}  ${D}state${R}       ${state || "unknown"}`);
  console.log("");
  console.log(MEMBRANE);

  // Knowledge
  const countLines = (f: string) => existsSync(f) ? readFileSync(f, "utf-8").split("\n").filter(l => l.startsWith("[") || l.startsWith("-") || l.startsWith("##")).length : 0;
  const lessons = countLines(".learning/lessons.md");
  const playbook = countLines(".learning/playbook.md");
  const failures = countLines(".learning/failures.md");
  const journalCount = existsSync(".tracking/journal.md") ? readFileSync(".tracking/journal.md", "utf-8").split("\n").filter(l => l.startsWith("[")).length : 0;

  console.log("");
  console.log(`  ${D}thoughts${R}  ${BC}${journalCount}${R}              ${D}lessons${R}   ${BC}${lessons}${R}`);
  console.log(`  ${D}patterns${R}  ${BC}${playbook}${R}              ${D}failures${R}  ${BC}${failures}${R}`);

  // Agents
  if (existsSync(".claude/agents")) {
    const agents = readdirSync(".claude/agents").filter(f => f.endsWith(".md"));
    if (agents.length > 0) {
      console.log("");
      console.log(`  ${D}agents${R}    ${agents.map(a => `${HELIX_SMALL} ${a.replace(".md", "")}`).join("    ")}`);
    }
  }

  // Last thought
  if (existsSync(".tracking/journal.md")) {
    const lines = readFileSync(".tracking/journal.md", "utf-8").split("\n").filter(l => l.startsWith("["));
    if (lines.length > 0) {
      const last = lines[lines.length - 1].replace(/\[.+?\]\s*/, "");
      console.log("");
      console.log(`  ${D}last thought${R}`);
      console.log(`  ${D}"${last.slice(0, 70)}"${R}`);
    }
  }

  console.log("");
}

// ── LIST (colony) ──
async function list() {
  const registry = loadRegistry();
  const pruned: string[] = [];
  for (const [path] of Object.entries(registry)) {
    if (!existsSync(join(path, "CLAUDE.md"))) { delete registry[path]; pruned.push(path); }
  }
  if (pruned.length > 0) writeFileSync(getRegistryPath(), JSON.stringify(registry, null, 2));

  const entries = Object.entries(registry) as [string, any][];
  if (entries.length === 0) { console.log(`\n  ${D}no organisms found.${R}\n`); return; }

  let aliveCount = 0;
  let dormantCount = 0;

  const lines: string[] = [];
  for (const [path, info] of entries) {
    const sessionName = pathToSession(path);
    const running = await $`tmux has-session -t ${sessionName} 2>/dev/null`.nothrow();
    const isAlive = running.exitCode === 0;
    if (isAlive) aliveCount++; else dormantCount++;

    const name = basename(path);
    const mission = info.mission?.slice(0, 50) || "";

    // Read journal count
    let thoughts = 0;
    const jPath = join(path, ".tracking/journal.md");
    if (existsSync(jPath)) thoughts = readFileSync(jPath, "utf-8").split("\n").filter(l => l.startsWith("[")).length;

    lines.push(`  ${isAlive ? ALIVE : DORMANT} ${B}${name}${R}${" ".repeat(Math.max(1, 22 - name.length))}${D}${mission}${R}`);
    lines.push(`    ${HELIX_SMALL}  ${D}thoughts ${BC}${thoughts}${R}`);
  }

  console.log("");
  console.log(`  ${D}organisms colony${R}${" ".repeat(30)}${BG}${aliveCount} alive${R} ${D}· ${Y}${dormantCount} dormant${R}`);
  console.log("");
  console.log(MEMBRANE);
  console.log("");
  for (const l of lines) console.log(l);
  console.log("");
  if (pruned.length > 0) console.log(`  ${D}pruned ${pruned.length} deleted organisms${R}\n`);
}

// ── GROW (spawn agent) ──
async function grow(role: string) {
  if (!role) { console.error(`usage: organisms grow ${D}<role>${R}`); process.exit(1); }
  if (!existsSync("CLAUDE.md")) { console.error(`${D}no organism here.${R}`); process.exit(1); }

  const name = role.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
  const agentPath = `.claude/agents/${name}.md`;
  if (existsSync(agentPath)) { console.error(`agent "${name}" already exists.`); process.exit(1); }

  mkdirSync(".claude/agents", { recursive: true });
  writeFileSync(agentPath, `---\nname: ${name}\ndescription: "${role}"\nmodel: sonnet\nallowedTools:\n  - Read\n  - Write\n  - Bash\n  - Grep\n  - Glob\n---\n\nYou are a specialized agent: ${role}.\n\n## Rules\n- Stay focused on your specialization\n- Report findings concisely\n- Note new discoveries for future reference\n`);

  console.log(`\n  ${BG}+${R} ${HELIX_SMALL} ${B}${name}${R}  ${D}spawned${R}`);
  console.log(`  ${D}the organism can invoke it via the Agent tool.${R}\n`);
}

// ── SHRINK (absorb agent) ──
async function shrink(name: string) {
  if (!existsSync(".claude/agents")) { console.error(`${D}no agents.${R}`); process.exit(1); }
  const agents = readdirSync(".claude/agents").filter(f => f.endsWith(".md"));
  if (agents.length === 0) { console.error(`${D}no agents to absorb.${R}`); process.exit(1); }

  if (!name) {
    console.log(`\n  ${D}agents:${R}`);
    agents.forEach((a) => console.log(`    ${HELIX_SMALL} ${a.replace(".md", "")}`));
    console.log(`\n  ${D}specify:${R} organisms shrink ${C}<name>${R}\n`);
    process.exit(0);
  }

  const safeName = name.toLowerCase().replace(/[^a-z0-9-]+/g, "").slice(0, 30);
  const agentPath = `.claude/agents/${safeName}.md`;
  if (!existsSync(agentPath)) { console.error(`agent "${safeName}" not found.`); process.exit(1); }

  rmSync(agentPath);
  console.log(`\n  ${DR}−${R} ${D}○·○${R} ${D}${safeName}${R}  ${D}absorbed${R}`);
  console.log(`  ${D}consider noting key findings in .learning/${R}\n`);
}

// ── EVOLVE (mutation) ──
async function evolve(concern: string) {
  if (!existsSync("CLAUDE.md")) { console.error(`${D}no organism here.${R}`); process.exit(1); }
  const sessionName = getSessionName();
  const running = await $`tmux has-session -t ${sessionName} 2>/dev/null`.nothrow();
  if (running.exitCode !== 0) { console.error(`${D}organism dormant. bring it to life first:${R} organisms start`); process.exit(1); }

  const prompt = concern
    ? `Evolve: evaluate your effectiveness regarding ${concern}. Read .learning/ and .tracking/journal.md. Adapt — change cron intervals, rewrite agent instructions, update priorities. Log mutations.`
    : `Evolve: full self-evaluation. Read .learning/ and .tracking/journal.md. What worked? What failed? Adapt — change intervals, rewrite agents, update priorities. Log mutations.`;

  const safePrompt = prompt.replace(/['"\\`$]/g, "");
  await $`tmux send-keys -t ${sessionName} ${safePrompt} Enter`;

  console.log("");
  console.log(`  ${G}◦${C}═══${G}◦${R}              ${G}◦${C}═══${G}◦${R}`);
  console.log(`  ${D} ╲ ╱${R}                ${D} ╲ ╱${R}`);
  console.log(`  ${D}  ${C}╳${R}    ${D}── ${Y}◈${R} ${D}──${R}    ${D}  ${C}╳${R}`);
  console.log(`  ${D} ╱ ╲${R}                ${D} ╱ ╲${R}`);
  console.log(`  ${G}◦${C}═══${G}◦${R}              ${G}◦${C}═══${G}◦${R}`);
  console.log("");
  console.log(`  ${D}evolution triggered. attach to observe:${R}`);
  console.log(`  organisms attach`);
  console.log("");
}

// ── ATTACH ──
async function attach() {
  if (!existsSync("CLAUDE.md")) { console.error(`${D}no organism here.${R}`); process.exit(1); }
  const sessionName = getSessionName();
  const running = await $`tmux has-session -t ${sessionName} 2>/dev/null`.nothrow();
  if (running.exitCode !== 0) { console.error(`${D}organism dormant. bring it to life:${R} organisms start`); process.exit(1); }
  await $`tmux attach -t ${sessionName}`.nothrow();
}

// ── LOGS (journal) ──
async function logs() {
  if (!existsSync(".tracking/journal.md")) { console.error(`${D}no journal found.${R}`); process.exit(1); }
  const follow = process.argv.includes("-f");
  if (follow) {
    await $`tail -f .tracking/journal.md`.nothrow();
  } else {
    const content = readFileSync(".tracking/journal.md", "utf-8");
    const lines = content.split("\n").filter(l => l.startsWith("["));
    const last20 = lines.slice(-20);
    if (last20.length === 0) { console.log(`\n  ${D}no thoughts yet.${R}\n`); return; }
    console.log(`\n  ${D}journal${R} ${D}(last ${last20.length} thoughts)${R}\n`);
    for (const l of last20) console.log(`  ${D}${l}${R}`);
    console.log("");
  }
}

// ── Helpers ──
function getSessionName() { return pathToSession(process.cwd()); }
function pathToSession(p: string) { return "org-" + p.replace(/\//g, "-").replace(/^-/, "").slice(-40); }

async function findClaude(): Promise<string | null> {
  for (const p of [`${process.env.HOME}/.local/bin/claude`, "/usr/local/bin/claude", `${process.env.HOME}/.claude/bin/claude`]) {
    if (existsSync(p)) return p;
  }
  const w = await $`which claude 2>/dev/null`.nothrow();
  return w.exitCode === 0 ? w.stdout.toString().trim() : null;
}

function getRegistryPath() { return `${process.env.HOME}/.organisms.json`; }
function loadRegistry(): Record<string, any> {
  const p = getRegistryPath();
  if (!existsSync(p)) return {};
  try { return JSON.parse(readFileSync(p, "utf-8")); } catch { return {}; }
}
function registerOrganism(path: string, mission: string) {
  const reg = loadRegistry();
  reg[path] = { mission, createdAt: new Date().toISOString() };
  writeFileSync(getRegistryPath(), JSON.stringify(reg, null, 2));
}
