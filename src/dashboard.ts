#!/usr/bin/env bun
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import { execSync } from "node:child_process";

// ── Colors (matched from cli.ts) ──
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
const HELIX_SMALL = `${G}◦${C}·${G}◦${R}`;

// ── Helpers (copied from cli.ts to avoid import issues) ──
function pathToSession(p: string): string {
  return "org-" + p.replace(/\//g, "-").replace(/^-/, "").slice(-40);
}

function getRegistryPath(): string {
  return `${process.env.HOME}/.organisms.json`;
}

function loadRegistry(): Record<string, any> {
  const p = getRegistryPath();
  if (!existsSync(p)) return {};
  try { return JSON.parse(readFileSync(p, "utf-8")); } catch { return {}; }
}

function isSessionAlive(sessionName: string): boolean {
  try {
    execSync(`tmux has-session -t ${sessionName} 2>/dev/null`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// ── State ──
let selectedIndex = 0;
let pulsePhase = 0;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

// ── Data Types ──
interface OrganismInfo {
  path: string;
  name: string;
  mission: string;
  alive: boolean;
  sessionName: string;
  born: string;
  state: string;
  thoughts: number;
  agents: string[];
  lastHeartbeat: string;
  lastThoughtText: string;
  journalEntries: string[];
  uptime: string;
  heartbeatAgo: string;
}

// ── Data Loading ──
function loadOrganisms(): OrganismInfo[] {
  const registry = loadRegistry();
  const entries = Object.entries(registry) as [string, any][];
  const organisms: OrganismInfo[] = [];

  for (const [path, info] of entries) {
    if (!existsSync(join(path, "CLAUDE.md"))) continue;

    const sessionName = pathToSession(path);
    const alive = isSessionAlive(sessionName);
    const name = basename(path);
    const mission = info.mission?.slice(0, 60) || "";

    let born = "";
    let state = "";
    const statusPath = join(path, ".tracking/status.md");
    if (existsSync(statusPath)) {
      const s = readFileSync(statusPath, "utf-8");
      born = s.match(/Born: (.+)/)?.[1] || "";
      state = s.match(/State: (.+)/)?.[1] || "";
    }

    let thoughts = 0;
    let lastHeartbeat = "";
    let lastThoughtText = "";
    const journalEntries: string[] = [];
    const jPath = join(path, ".tracking/journal.md");
    if (existsSync(jPath)) {
      const lines = readFileSync(jPath, "utf-8").split("\n").filter(l => l.startsWith("["));
      thoughts = lines.length;
      if (lines.length > 0) {
        const last = lines[lines.length - 1];
        lastHeartbeat = last.match(/\[(.+?)\]/)?.[1] || "";
        lastThoughtText = last.replace(/\[.+?\]\s*/, "").slice(0, 65);
      }
      // Keep last 15 entries (we'll trim to fit terminal later)
      const tail = lines.slice(-15);
      for (const l of tail) {
        journalEntries.push(l);
      }
    }

    // Agents
    const agents: string[] = [];
    const agentsDir = join(path, ".claude/agents");
    if (existsSync(agentsDir)) {
      try {
        const files = readdirSync(agentsDir).filter(f => f.endsWith(".md"));
        for (const f of files) agents.push(f.replace(".md", ""));
      } catch {}
    }

    // Uptime
    let uptime = "";
    if (born) {
      const ms = Date.now() - new Date(born).getTime();
      if (ms > 0) {
        const d = Math.floor(ms / 86400000);
        const h = Math.floor((ms % 86400000) / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        if (d > 0) uptime = `${d}d ${h}h`;
        else if (h > 0) uptime = `${h}h ${m}m`;
        else uptime = `${m}m`;
      }
    }

    // Heartbeat ago
    let heartbeatAgo = "";
    if (lastHeartbeat) {
      const parsed = parseHeartbeatTime(lastHeartbeat);
      if (parsed) {
        const diffMs = Date.now() - parsed.getTime();
        if (diffMs > 0) {
          const sec = Math.floor(diffMs / 1000);
          const min = Math.floor(sec / 60);
          const hr = Math.floor(min / 60);
          const day = Math.floor(hr / 24);
          if (day > 0) heartbeatAgo = `${day}d ago`;
          else if (hr > 0) heartbeatAgo = `${hr}h ago`;
          else if (min > 0) heartbeatAgo = `${min}m ago`;
          else heartbeatAgo = `${sec}s ago`;
        }
      }
    }

    organisms.push({
      path, name, mission, alive, sessionName,
      born, state, thoughts, agents,
      lastHeartbeat, lastThoughtText, journalEntries,
      uptime, heartbeatAgo,
    });
  }

  // Sort: alive first, then by name
  organisms.sort((a, b) => {
    if (a.alive !== b.alive) return a.alive ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return organisms;
}

function parseHeartbeatTime(ts: string): Date | null {
  // Try common formats: "2026-04-05 18:47", "2026-04-05T18:47:23", "18:47"
  try {
    // Full ISO-ish
    if (ts.includes("-") && ts.length >= 16) {
      return new Date(ts.replace(" ", "T"));
    }
    // Time only (HH:MM) — assume today
    const timeMatch = ts.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (timeMatch) {
      const now = new Date();
      now.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2]), parseInt(timeMatch[3] || "0"), 0);
      return now;
    }
    return new Date(ts);
  } catch {
    return null;
  }
}

// ── Terminal Helpers ──
function write(s: string) { process.stdout.write(s); }
function moveTo(row: number, col: number) { write(`\x1b[${row};${col}H`); }
function clearScreen() { write("\x1b[2J\x1b[H"); }
function hideCursor() { write("\x1b[?25l"); }
function showCursor() { write("\x1b[?25h"); }

function cols(): number { return process.stdout.columns || 80; }
function rows(): number { return process.stdout.rows || 24; }

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

function pad(s: string, len: number): string {
  const visible = stripAnsi(s).length;
  if (visible >= len) return s;
  return s + " ".repeat(len - visible);
}

// ── Render ──
function render(organisms: OrganismInfo[]) {
  clearScreen();
  const w = cols();
  const h = rows();

  let row = 1;

  const aliveCount = organisms.filter(o => o.alive).length;
  const dormantCount = organisms.filter(o => !o.alive).length;
  const timeStr = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  // ── Header: DNA helix ──
  const summaryParts: string[] = [];
  if (aliveCount > 0) summaryParts.push(`${BG}${aliveCount} alive${R}`);
  if (dormantCount > 0) summaryParts.push(`${Y}${dormantCount} dormant${R}`);
  const summary = summaryParts.join(` ${D}·${R} `);

  moveTo(row++, 1);
  write("");
  moveTo(row++, 1);
  write(`${G}      ◦${C}———${G}◦${R}`);
  moveTo(row++, 1);
  write(`${D}       ╲ ╱${R}    ${B}${W}organisms${R}                    ${summary}`);
  moveTo(row++, 1);
  write(`${D}        ${C}╳${R}`);
  moveTo(row++, 1);
  write(`${D}       ╱ ╲${R}    ${D}last refresh: ${BC}${timeStr}${R}`);
  moveTo(row++, 1);
  write(`${G}      ◦${C}———${G}◦${R}`);

  // ── Membrane ──
  row++;
  moveTo(row++, 1);
  const membraneLen = Math.min(w - 2, 60);
  write(`${D}  ${"┄".repeat(membraneLen)}${R}`);
  row++;

  if (organisms.length === 0) {
    moveTo(row++, 1);
    write(`  ${D}no organisms found.${R}`);
    moveTo(row + 1, 1);
    write(`  ${D}create one:${R} organisms init ${Y}"your mission"${R}`);
    renderFooter(h);
    return;
  }

  // Clamp selectedIndex
  if (selectedIndex >= organisms.length) selectedIndex = 0;
  if (selectedIndex < 0) selectedIndex = organisms.length - 1;

  // ── Organism List ──
  for (let i = 0; i < organisms.length; i++) {
    const o = organisms[i];
    const isSelected = i === selectedIndex;

    // Pulse effect: alive organisms alternate bright/normal green
    let indicator: string;
    if (o.alive) {
      indicator = (pulsePhase % 2 === 0) ? `${BG}●${R}` : `${G}●${R}`;
    } else {
      indicator = `${D}○${R}`;
    }

    // Selection marker
    const selector = isSelected ? `${BC}›${R} ` : "  ";

    // First line: name + uptime + agents
    const agentStr = o.agents.length > 0
      ? o.agents.map(a => `${HELIX_SMALL} ${D}${a}${R}`).join("  ")
      : "";

    const nameCol = pad(`${selector}${indicator} ${B}${W}${o.name}${R}`, 32);

    if (o.alive) {
      const uptimeStr = o.uptime ? `${D}uptime ${BC}${o.uptime}${R}` : "";
      moveTo(row++, 1);
      write(`${nameCol}${pad(uptimeStr, 22)}${agentStr}`);

      // Second line: heartbeat + thoughts
      const hbStr = o.heartbeatAgo ? `${D}heartbeat ${BC}${o.heartbeatAgo}${R}` : `${D}heartbeat ${D}—${R}`;
      const thStr = `${D}thoughts ${BC}${o.thoughts}${R}`;
      moveTo(row++, 1);
      write(`    ${pad(hbStr, 28)}${thStr}`);
    } else {
      const dormantStr = o.heartbeatAgo ? `${D}dormant ${Y}${o.heartbeatAgo}${R}` : `${Y}dormant${R}`;
      moveTo(row++, 1);
      write(`${nameCol}${dormantStr}`);

      const thStr = o.thoughts > 0 ? `${D}last thought ${BC}${o.thoughts}${R}` : "";
      moveTo(row++, 1);
      write(`    ${thStr}`);
    }

    // Third line: last thought text (if has one)
    if (o.lastThoughtText) {
      moveTo(row++, 1);
      write(`    ${D}"${o.lastThoughtText}"${R}`);
    }

    row++; // blank line between organisms
  }

  // ── Journal Panel ──
  moveTo(row++, 1);
  write(`${D}  ${"┄".repeat(membraneLen)}${R}`);
  row++;

  const selected = organisms[selectedIndex];
  if (selected) {
    moveTo(row++, 1);
    write(`  ${D}live journal ${C}─${R} ${B}${selected.name}${R}`);

    // Calculate how many journal lines we can show
    const footerRows = 2; // footer + blank
    const available = h - row - footerRows;
    const maxEntries = Math.max(3, Math.min(available, 10));

    const entries = selected.journalEntries.slice(-maxEntries);

    if (entries.length === 0) {
      moveTo(row++, 1);
      write(`  ${D}no thoughts yet.${R}`);
    } else {
      for (const entry of entries) {
        if (row >= h - footerRows) break;
        // Format: [timestamp] text → show with dim styling
        const tsMatch = entry.match(/^\[(.+?)\]\s*(.*)/);
        if (tsMatch) {
          const ts = tsMatch[1];
          let text = tsMatch[2];
          // Truncate to terminal width
          const maxTextLen = w - 12;
          if (text.length > maxTextLen) text = text.slice(0, maxTextLen - 3) + "...";
          moveTo(row++, 1);
          write(`  ${D}[${BC}${ts}${D}]${R} ${D}${text}${R}`);
        } else {
          moveTo(row++, 1);
          write(`  ${D}${entry.slice(0, w - 4)}${R}`);
        }
      }
    }
  }

  renderFooter(h);
}

function renderFooter(h: number) {
  moveTo(h, 1);
  write(`  ${D}q${R} quit  ${D}tab${R} switch organism  ${D}s${R} start  ${D}k${R} stop  ${D}e${R} evolve`);
}

// ── Keyboard Handling ──
function setupKeyboard(getOrganisms: () => OrganismInfo[]) {
  if (!process.stdin.setRawMode) return;
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf-8");

  process.stdin.on("data", (key: string) => {
    const code = key.charCodeAt(0);

    if (key === "q" || key === "Q" || code === 3 /* ctrl-c */) {
      cleanup();
      return;
    }

    if (key === "\t") {
      // Cycle to next organism
      const orgs = getOrganisms();
      if (orgs.length > 0) {
        selectedIndex = (selectedIndex + 1) % orgs.length;
        render(orgs);
      }
      return;
    }

    if (key === "s" || key === "S") {
      // Start selected organism
      const orgs = getOrganisms();
      if (orgs.length > 0 && selectedIndex < orgs.length) {
        const o = orgs[selectedIndex];
        if (!o.alive) {
          try {
            execSync(`cd "${o.path}" && organisms start`, { stdio: "ignore" });
          } catch {}
        }
      }
      return;
    }

    if (key === "k" || key === "K") {
      // Stop selected organism
      const orgs = getOrganisms();
      if (orgs.length > 0 && selectedIndex < orgs.length) {
        const o = orgs[selectedIndex];
        if (o.alive) {
          try {
            execSync(`cd "${o.path}" && organisms stop`, { stdio: "ignore" });
          } catch {}
        }
      }
      return;
    }

    if (key === "e" || key === "E") {
      // Evolve selected organism
      const orgs = getOrganisms();
      if (orgs.length > 0 && selectedIndex < orgs.length) {
        const o = orgs[selectedIndex];
        if (o.alive) {
          try {
            execSync(`cd "${o.path}" && organisms evolve`, { stdio: "ignore" });
          } catch {}
        }
      }
      return;
    }
  });
}

// ── Lifecycle ──
function cleanup() {
  if (refreshTimer) clearInterval(refreshTimer);
  showCursor();
  clearScreen();
  moveTo(1, 1);
  write(`\n  ${D}dashboard closed${R}\n\n`);
  if (process.stdin.setRawMode) process.stdin.setRawMode(false);
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("SIGHUP", cleanup);

// Handle terminal resize
process.stdout.on("resize", () => {
  const orgs = loadOrganisms();
  render(orgs);
});

// ── Main ──
hideCursor();

let cachedOrganisms = loadOrganisms();
render(cachedOrganisms);

setupKeyboard(() => cachedOrganisms);

refreshTimer = setInterval(() => {
  pulsePhase++;
  cachedOrganisms = loadOrganisms();
  render(cachedOrganisms);
}, 3000);
