#!/usr/bin/env bun
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import { execSync } from "node:child_process";

// ── Helpers (same as dashboard.ts) ──
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

// ── Data Types ──
interface OrganismData {
  name: string;
  path: string;
  mission: string;
  alive: boolean;
  born: string;
  uptime: string;
  thoughts: number;
  agents: string[];
  lastThought: string;
  lastHeartbeat: string;
}

interface JournalEntry {
  time: string;
  text: string;
}

// ── Data Loading ──
function getColonyData(): OrganismData[] {
  const registry = loadRegistry();
  const entries = Object.entries(registry) as [string, any][];
  const organisms: OrganismData[] = [];

  for (const [path, info] of entries) {
    if (!existsSync(join(path, "CLAUDE.md"))) continue;

    const sessionName = pathToSession(path);
    const alive = isSessionAlive(sessionName);
    const name = basename(path);
    const mission = info.mission?.slice(0, 120) || "";

    let born = "";
    const statusPath = join(path, ".tracking/status.md");
    if (existsSync(statusPath)) {
      const s = readFileSync(statusPath, "utf-8");
      born = s.match(/Born: (.+)/)?.[1]?.trim() || "";
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

    // Journal
    let thoughts = 0;
    let lastThought = "";
    let lastHeartbeat = "";
    const jPath = join(path, ".tracking/journal.md");
    if (existsSync(jPath)) {
      const lines = readFileSync(jPath, "utf-8").split("\n").filter(l => l.startsWith("["));
      thoughts = lines.length;
      if (lines.length > 0) {
        const last = lines[lines.length - 1];
        lastHeartbeat = last.match(/\[(.+?)\]/)?.[1] || "";
        lastThought = last.replace(/\[.+?\]\s*/, "").slice(0, 120);
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

    organisms.push({ name, path, mission, alive, born, uptime, thoughts, agents, lastThought, lastHeartbeat });
  }

  // Sort: alive first, then by name
  organisms.sort((a, b) => {
    if (a.alive !== b.alive) return a.alive ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return organisms;
}

function getJournalEntries(orgName: string, limit = 50): JournalEntry[] {
  const registry = loadRegistry();
  const entries = Object.entries(registry) as [string, any][];

  for (const [path] of entries) {
    if (basename(path) !== orgName) continue;
    const jPath = join(path, ".tracking/journal.md");
    if (!existsSync(jPath)) return [];

    const lines = readFileSync(jPath, "utf-8").split("\n").filter(l => l.startsWith("["));
    const tail = lines.slice(-limit);
    return tail.map(l => {
      const m = l.match(/^\[(.+?)\]\s*(.*)/);
      return m ? { time: m[1], text: m[2] } : { time: "", text: l };
    });
  }
  return [];
}

// ── Organism Detail ──
interface OrganismDetail {
  name: string;
  path: string;
  mission: string;
  alive: boolean;
  born: string;
  uptime: string;
  state: string;
  thoughts: number;
  lastHeartbeat: string;
  agents: { name: string; description: string }[];
  knowledge: {
    lessons: number;
    patterns: number;
    failures: number;
    lessonsList: string[];
    playbookList: string[];
  };
  priorities: string[];
  studies: string[];
  invariants: string[];
  dnaVersion: string;
  journal: JournalEntry[];
}

function getOrganismDetail(orgName: string): OrganismDetail | null {
  const registry = loadRegistry();
  const entries = Object.entries(registry) as [string, any][];

  for (const [path, info] of entries) {
    if (basename(path) !== orgName) continue;
    if (!existsSync(join(path, "CLAUDE.md"))) return null;

    const sessionName = pathToSession(path);
    const alive = isSessionAlive(sessionName);
    const name = basename(path);

    // Read CLAUDE.md for mission, invariants, dna version
    let mission = info.mission || "";
    let invariants: string[] = [];
    let dnaVersion = "";
    const claudePath = join(path, "CLAUDE.md");
    if (existsSync(claudePath)) {
      const claude = readFileSync(claudePath, "utf-8");
      const missionMatch = claude.match(/<mission>\s*([\s\S]*?)\s*<\/mission>/);
      if (missionMatch) mission = missionMatch[1].trim();
      const invariantsMatch = claude.match(/<invariants>\s*([\s\S]*?)\s*<\/invariants>/);
      if (invariantsMatch) {
        invariants = invariantsMatch[1].split("\n")
          .map(l => l.replace(/^[-*]\s*/, "").trim())
          .filter(l => l.length > 0);
      }
      const dnaMatch = claude.match(/<!-- organisms-dna v(.*?) -->/);
      if (dnaMatch) dnaVersion = "v" + dnaMatch[1];
    }

    // Status
    let born = "";
    let state = "";
    const statusPath = join(path, ".tracking/status.md");
    if (existsSync(statusPath)) {
      const s = readFileSync(statusPath, "utf-8");
      born = s.match(/Born: (.+)/)?.[1]?.trim() || "";
      state = s.match(/State: (.+)/)?.[1]?.trim() || "";
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

    // Journal
    let thoughts = 0;
    let lastHeartbeat = "";
    const journal: JournalEntry[] = [];
    const jPath = join(path, ".tracking/journal.md");
    if (existsSync(jPath)) {
      const lines = readFileSync(jPath, "utf-8").split("\n").filter(l => l.startsWith("["));
      thoughts = lines.length;
      const tail = lines.slice(-30);
      for (const l of tail) {
        const m = l.match(/^\[(.+?)\]\s*(.*)/);
        if (m) journal.push({ time: m[1], text: m[2] });
      }
      if (lines.length > 0) {
        const last = lines[lines.length - 1];
        const timeMatch = last.match(/\[(.+?)\]/);
        if (timeMatch) {
          const ts = new Date(timeMatch[1]);
          if (!isNaN(ts.getTime())) {
            const diff = Date.now() - ts.getTime();
            const mins = Math.floor(diff / 60000);
            if (mins < 1) lastHeartbeat = "just now";
            else if (mins < 60) lastHeartbeat = `${mins}m ago`;
            else lastHeartbeat = `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
          } else {
            lastHeartbeat = timeMatch[1];
          }
        }
      }
    }

    // Priorities
    let priorities: string[] = [];
    const priPath = join(path, ".tracking/priorities.md");
    if (existsSync(priPath)) {
      priorities = readFileSync(priPath, "utf-8").split("\n")
        .filter(l => /^(\d+[.)]\s+|-\s+)/.test(l.trim()))
        .map(l => l.trim().replace(/^(\d+[.)]\s+|-\s+)/, "").trim())
        .filter(l => l.length > 0);
    }

    // Agents
    const agents: { name: string; description: string }[] = [];
    const agentsDir = join(path, ".claude/agents");
    if (existsSync(agentsDir)) {
      try {
        const files = readdirSync(agentsDir).filter(f => f.endsWith(".md"));
        for (const f of files) {
          const agentName = f.replace(".md", "");
          let description = "";
          try {
            const content = readFileSync(join(agentsDir, f), "utf-8");
            const descMatch = content.match(/description:\s*"?([^"\n]+)"?/);
            if (descMatch) description = descMatch[1].trim().slice(0, 120);
          } catch {}
          agents.push({ name: agentName, description });
        }
      } catch {}
    }

    // Knowledge: lessons
    let lessonsCount = 0;
    let lessonsList: string[] = [];
    const lessonsPath = join(path, ".learning/lessons.md");
    if (existsSync(lessonsPath)) {
      const lines = readFileSync(lessonsPath, "utf-8").split("\n")
        .filter(l => l.trim().length > 0 && !l.startsWith("#"));
      lessonsCount = lines.length;
      lessonsList = lines.slice(-10);
    }

    // Knowledge: playbook (patterns)
    let patternsCount = 0;
    let playbookList: string[] = [];
    const playbookPath = join(path, ".learning/playbook.md");
    if (existsSync(playbookPath)) {
      const lines = readFileSync(playbookPath, "utf-8").split("\n")
        .filter(l => l.trim().length > 0 && !l.startsWith("#"));
      patternsCount = lines.length;
      playbookList = lines.slice(-10);
    }

    // Knowledge: failures
    let failuresCount = 0;
    const failuresPath = join(path, ".learning/failures.md");
    if (existsSync(failuresPath)) {
      const lines = readFileSync(failuresPath, "utf-8").split("\n")
        .filter(l => l.trim().length > 0 && !l.startsWith("#"));
      failuresCount = lines.length;
    }

    // Studies
    let studies: string[] = [];
    const studiesDir = join(path, ".learning/studies");
    if (existsSync(studiesDir)) {
      try {
        studies = readdirSync(studiesDir)
          .filter(f => f.endsWith(".md"))
          .map(f => f.replace(".md", ""));
      } catch {}
    }

    return {
      name, path, mission, alive, born, uptime, state, thoughts,
      lastHeartbeat, agents,
      knowledge: {
        lessons: lessonsCount,
        patterns: patternsCount,
        failures: failuresCount,
        lessonsList,
        playbookList,
      },
      priorities, studies, invariants, dnaVersion, journal,
    };
  }
  return null;
}

// ── HTML Template ──
const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>organisms</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0a0e12;
    --surface: #111827;
    --surface-hover: #1a2332;
    --primary: #22c55e;
    --primary-dim: rgba(34, 197, 94, 0.3);
    --primary-glow: rgba(34, 197, 94, 0.15);
    --secondary: #06b6d4;
    --secondary-dim: rgba(6, 182, 212, 0.3);
    --accent: #f59e0b;
    --accent-dim: rgba(245, 158, 11, 0.3);
    --text: #e5e7eb;
    --dim: #6b7280;
    --dim-light: #9ca3af;
    --danger: #ef4444;
    --danger-dim: rgba(239, 68, 68, 0.3);
  }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', 'Cascadia Code', monospace;
    font-size: 13px;
    line-height: 1.6;
    min-height: 100vh;
    overflow-x: hidden;
  }

  ::selection { background: var(--primary-dim); color: var(--text); }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--dim); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--dim-light); }

  .container {
    max-width: 1100px;
    margin: 0 auto;
    padding: 24px 20px;
  }

  /* ── Header ── */
  .header {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 20px 0 24px;
    border-bottom: 1px solid rgba(107, 114, 128, 0.2);
    margin-bottom: 28px;
  }

  /* ── DNA Helix (CSS animated SVG) ── */
  .dna-helix {
    width: 52px;
    height: 88px;
    flex-shrink: 0;
    position: relative;
    overflow: visible;
  }

  .dna-helix svg {
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .dna-helix .strand-left {
    fill: none;
    stroke: var(--primary);
    stroke-width: 2;
    stroke-linecap: round;
    filter: drop-shadow(0 0 4px var(--primary-dim));
  }

  .dna-helix .strand-right {
    fill: none;
    stroke: var(--primary);
    stroke-width: 2;
    stroke-linecap: round;
    filter: drop-shadow(0 0 4px var(--primary-dim));
  }

  .dna-helix .bond {
    stroke: var(--secondary);
    stroke-width: 1;
    opacity: 0.4;
  }

  .dna-helix .node {
    fill: var(--primary);
    filter: drop-shadow(0 0 6px var(--primary-dim));
  }

  .dna-helix .node-right {
    fill: var(--primary);
    filter: drop-shadow(0 0 6px var(--primary-dim));
  }

  @keyframes dnaFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }

  .dna-helix {
    animation: dnaFloat 4s ease-in-out infinite;
  }

  @keyframes nodeGlow {
    0%, 100% { opacity: 0.7; r: 3; }
    50% { opacity: 1; r: 3.5; }
  }

  .dna-helix .node, .dna-helix .node-right {
    animation: nodeGlow 3s ease-in-out infinite;
  }

  .dna-helix .node:nth-child(2) { animation-delay: 0.5s; }
  .dna-helix .node:nth-child(3) { animation-delay: 1s; }
  .dna-helix .node:nth-child(4) { animation-delay: 1.5s; }
  .dna-helix .node-right:nth-child(2) { animation-delay: 0.75s; }
  .dna-helix .node-right:nth-child(3) { animation-delay: 1.25s; }
  .dna-helix .node-right:nth-child(4) { animation-delay: 1.75s; }

  @keyframes bondPulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.6; }
  }

  .dna-helix .bond {
    animation: bondPulse 2.5s ease-in-out infinite;
  }

  .dna-helix .bond:nth-child(2) { animation-delay: 0.4s; }
  .dna-helix .bond:nth-child(3) { animation-delay: 0.8s; }
  .dna-helix .bond:nth-child(4) { animation-delay: 1.2s; }
  .dna-helix .bond:nth-child(5) { animation-delay: 1.6s; }
  .dna-helix .bond:nth-child(6) { animation-delay: 2.0s; }
  .dna-helix .bond:nth-child(7) { animation-delay: 2.4s; }

  .header-text { flex: 1; }

  .header-title {
    font-size: 22px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: 1px;
  }

  .header-stats {
    margin-top: 4px;
    font-size: 13px;
    color: var(--dim);
  }

  .stat-alive { color: var(--primary); font-weight: 600; }
  .stat-dormant { color: var(--accent); font-weight: 600; }
  .stat-sep { color: var(--dim); margin: 0 6px; }

  .header-live {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--dim);
    text-transform: uppercase;
    letter-spacing: 1.5px;
  }

  .live-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--primary);
    animation: livePulse 2s ease-in-out infinite;
  }

  @keyframes livePulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.6); }
    50% { box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
  }

  /* ── Cards Grid ── */
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
    margin-bottom: 28px;
  }

  .card {
    background: var(--surface);
    border: 1px solid rgba(107, 114, 128, 0.15);
    border-radius: 10px;
    padding: 18px 20px;
    cursor: pointer;
    transition: all 0.25s ease;
    position: relative;
    overflow: hidden;
  }

  .card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: transparent;
    transition: background 0.25s ease;
  }

  .card:hover {
    background: var(--surface-hover);
    transform: translateY(-1px);
  }

  .card.alive {
    border-color: var(--primary-dim);
  }

  .card.alive::before {
    background: linear-gradient(90deg, transparent, var(--primary), transparent);
    opacity: 0.6;
  }

  .card.alive:hover {
    border-color: rgba(34, 197, 94, 0.5);
    box-shadow: 0 4px 24px rgba(34, 197, 94, 0.08);
  }

  .card.dormant {
    opacity: 0.55;
    border-color: rgba(107, 114, 128, 0.1);
  }

  .card.dormant:hover {
    opacity: 0.75;
  }

  .card.selected {
    border-color: var(--secondary);
    box-shadow: 0 0 0 1px var(--secondary-dim), 0 4px 20px rgba(6, 182, 212, 0.1);
  }

  .card.selected::before {
    background: linear-gradient(90deg, transparent, var(--secondary), transparent);
    opacity: 0.8;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }

  .alive-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .alive-dot.on {
    background: var(--primary);
    box-shadow: 0 0 8px var(--primary-dim);
    animation: pulse 2.5s ease-in-out infinite;
  }

  .alive-dot.off {
    background: var(--dim);
    opacity: 0.5;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
    50% { opacity: 0.8; box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
  }

  .card-name {
    font-size: 15px;
    font-weight: 700;
    color: var(--text);
    flex: 1;
  }

  .card-uptime {
    font-size: 11px;
    color: var(--secondary);
    font-weight: 500;
  }

  .card-meta {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 10px;
    font-size: 12px;
    color: var(--dim);
  }

  .card-thoughts {
    color: var(--dim-light);
  }

  .card-thoughts span { color: var(--secondary); font-weight: 600; }

  .card-agents {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 8px;
  }

  .agent-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: var(--secondary);
    background: rgba(6, 182, 212, 0.08);
    border: 1px solid rgba(6, 182, 212, 0.15);
    border-radius: 4px;
    padding: 2px 8px;
  }

  .agent-tag .helix { color: var(--primary); font-size: 10px; }

  .card-thought {
    font-size: 12px;
    color: var(--dim);
    font-style: italic;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
    margin-top: 4px;
  }

  .card-dormant-label {
    font-size: 12px;
    color: var(--accent);
    font-weight: 500;
  }

  /* ── Journal Panel ── */
  .journal-panel {
    background: var(--surface);
    border: 1px solid rgba(107, 114, 128, 0.15);
    border-radius: 10px;
    margin-bottom: 20px;
    overflow: hidden;
  }

  .journal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    border-bottom: 1px solid rgba(107, 114, 128, 0.12);
  }

  .journal-title {
    font-size: 13px;
    color: var(--dim);
  }

  .journal-title span {
    color: var(--text);
    font-weight: 600;
  }

  .journal-live {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--dim);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .journal-live .live-dot {
    width: 6px;
    height: 6px;
  }

  .journal-entries {
    padding: 8px 0;
    max-height: 340px;
    overflow-y: auto;
    scroll-behavior: smooth;
  }

  .journal-empty {
    padding: 32px 20px;
    text-align: center;
    color: var(--dim);
    font-style: italic;
  }

  .journal-entry {
    padding: 6px 20px;
    display: flex;
    gap: 12px;
    font-size: 12px;
    transition: background 0.15s ease;
  }

  .journal-entry:hover {
    background: rgba(255, 255, 255, 0.02);
  }

  .journal-time {
    color: var(--secondary);
    font-weight: 500;
    white-space: nowrap;
    min-width: 50px;
    flex-shrink: 0;
  }

  .journal-text {
    color: var(--dim-light);
    word-break: break-word;
  }

  @keyframes journalFadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .journal-entry.new {
    animation: journalFadeIn 0.4s ease;
  }

  /* ── Action Bar ── */
  .actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    padding-bottom: 20px;
  }

  .action-btn {
    background: var(--surface);
    border: 1px solid rgba(107, 114, 128, 0.2);
    border-radius: 6px;
    padding: 8px 18px;
    font-family: inherit;
    font-size: 12px;
    color: var(--dim-light);
    cursor: pointer;
    transition: all 0.2s ease;
    letter-spacing: 0.5px;
  }

  .action-btn:hover {
    background: var(--surface-hover);
    color: var(--text);
    border-color: rgba(107, 114, 128, 0.35);
  }

  .action-btn.start:hover { border-color: var(--primary-dim); color: var(--primary); }
  .action-btn.stop:hover { border-color: var(--danger-dim); color: var(--danger); }
  .action-btn.evolve:hover { border-color: var(--accent-dim); color: var(--accent); }
  .action-btn.attach:hover { border-color: var(--secondary-dim); color: var(--secondary); }

  .action-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .action-btn:active:not(:disabled) {
    transform: scale(0.97);
  }

  /* ── Status toast ── */
  .toast {
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: var(--surface);
    border: 1px solid var(--primary-dim);
    border-radius: 8px;
    padding: 10px 16px;
    font-size: 12px;
    color: var(--text);
    opacity: 0;
    transform: translateY(10px);
    transition: all 0.3s ease;
    pointer-events: none;
    z-index: 100;
  }

  .toast.show {
    opacity: 1;
    transform: translateY(0);
  }

  .toast.error { border-color: var(--danger-dim); }

  /* ── No organisms state ── */
  .empty-state {
    text-align: center;
    padding: 80px 20px;
    color: var(--dim);
  }

  .empty-state .helix-large {
    font-size: 32px;
    color: var(--primary);
    margin-bottom: 16px;
    opacity: 0.4;
  }

  .empty-state p { margin-bottom: 8px; }
  .empty-state code {
    background: rgba(6, 182, 212, 0.1);
    color: var(--secondary);
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
  }

  /* ── WS status indicator ── */
  .ws-status {
    position: fixed;
    bottom: 12px;
    left: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    color: var(--dim);
    letter-spacing: 0.5px;
  }

  .ws-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--dim);
    transition: background 0.3s;
  }

  .ws-dot.connected { background: var(--primary); }
  .ws-dot.disconnected { background: var(--danger); }

  /* ── Detail Panel ── */
  .detail-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 99;
    display: none;
    backdrop-filter: blur(2px);
  }
  .detail-overlay.open { display: block; }

  .detail-panel {
    position: fixed;
    top: 0;
    right: -65%;
    width: 60%;
    height: 100vh;
    background: #0d1117;
    border-left: 1px solid rgba(34, 197, 94, 0.2);
    overflow-y: auto;
    transition: right 0.3s ease;
    z-index: 100;
    padding: 2rem;
    box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);
  }
  .detail-panel.open { right: 0; }

  .close-btn {
    position: absolute;
    top: 16px;
    right: 20px;
    background: none;
    border: none;
    color: var(--dim);
    font-size: 28px;
    cursor: pointer;
    line-height: 1;
    padding: 4px 8px;
    transition: color 0.2s;
    font-family: inherit;
  }
  .close-btn:hover { color: var(--text); }

  .detail-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
    padding-right: 40px;
  }

  .detail-status {
    font-size: 14px;
    line-height: 1;
  }
  .detail-status.on { color: var(--primary); text-shadow: 0 0 8px var(--primary-dim); }
  .detail-status.off { color: var(--dim); }

  .detail-name {
    font-size: 20px;
    font-weight: 700;
    color: var(--text);
    flex: 1;
    margin: 0;
  }

  .detail-uptime {
    font-size: 12px;
    color: var(--secondary);
    font-weight: 500;
  }

  .detail-heartbeat {
    font-size: 11px;
    color: var(--dim);
    margin-bottom: 20px;
  }

  .detail-dna {
    font-size: 10px;
    color: var(--dim);
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-left: 8px;
    opacity: 0.6;
  }

  .detail-divider {
    border: none;
    border-top: 1px solid rgba(34, 197, 94, 0.1);
    margin: 16px 0;
    position: relative;
  }

  .detail-section {
    margin-bottom: 20px;
  }

  .detail-section h3 {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: rgba(34, 197, 94, 0.5);
    font-weight: 600;
    margin-bottom: 10px;
  }

  .detail-mission {
    font-size: 13px;
    color: var(--dim-light);
    line-height: 1.7;
    white-space: pre-wrap;
  }

  .detail-state {
    font-size: 12px;
    color: var(--dim-light);
    margin-bottom: 20px;
  }
  .detail-state span { color: var(--primary); }

  .detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 4px;
  }

  .knowledge-stats {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
  }

  .knowledge-stats > div {
    font-size: 12px;
    color: var(--dim);
  }

  .stat-num {
    color: var(--secondary);
    font-weight: 700;
    font-size: 16px;
    margin-right: 4px;
  }

  .knowledge-items {
    margin-top: 10px;
    max-height: 120px;
    overflow-y: auto;
  }

  .knowledge-items div {
    font-size: 11px;
    color: var(--dim);
    padding: 2px 0;
    border-bottom: 1px solid rgba(107, 114, 128, 0.06);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .agent-list .agent-item {
    font-size: 12px;
    padding: 4px 0;
    display: flex;
    gap: 8px;
    align-items: baseline;
  }

  .agent-item .agent-sym {
    color: var(--primary);
    font-size: 10px;
    flex-shrink: 0;
  }

  .agent-item .agent-name {
    color: var(--text);
    font-weight: 600;
  }

  .agent-item .agent-desc {
    color: var(--dim);
    font-size: 11px;
  }

  .priorities-list {
    list-style: none;
    counter-reset: pri;
  }

  .priorities-list li {
    font-size: 12px;
    color: var(--dim-light);
    padding: 3px 0;
    counter-increment: pri;
  }

  .priorities-list li::before {
    content: counter(pri) ".";
    color: var(--secondary);
    font-weight: 600;
    margin-right: 8px;
    font-size: 11px;
  }

  .studies-list div {
    font-size: 12px;
    color: var(--dim);
    padding: 3px 0;
  }

  .studies-list div::before {
    content: "\\2022 ";
    color: var(--primary);
    margin-right: 6px;
  }

  .invariants-list {
    list-style: none;
  }

  .invariants-list li {
    font-size: 11px;
    color: rgba(239, 68, 68, 0.55);
    padding: 3px 0;
    border-bottom: 1px solid rgba(239, 68, 68, 0.05);
  }

  .detail-journal {
    max-height: 200px;
    overflow-y: auto;
  }

  .detail-journal .dj-entry {
    display: flex;
    gap: 10px;
    font-size: 12px;
    padding: 3px 0;
  }

  .detail-journal .dj-time {
    color: var(--secondary);
    font-weight: 500;
    white-space: nowrap;
    min-width: 48px;
    flex-shrink: 0;
  }

  .detail-journal .dj-text {
    color: var(--dim);
    word-break: break-word;
  }

  .detail-actions {
    display: flex;
    gap: 10px;
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid rgba(34, 197, 94, 0.1);
  }

  .detail-actions button {
    background: var(--surface);
    border: 1px solid rgba(107, 114, 128, 0.2);
    border-radius: 6px;
    padding: 8px 18px;
    font-family: inherit;
    font-size: 12px;
    color: var(--dim-light);
    cursor: pointer;
    transition: all 0.2s ease;
    letter-spacing: 0.5px;
  }

  .detail-actions button:hover {
    background: var(--surface-hover);
    color: var(--text);
    border-color: rgba(107, 114, 128, 0.35);
  }

  .detail-actions button:nth-child(1):hover { border-color: var(--primary-dim); color: var(--primary); }
  .detail-actions button:nth-child(2):hover { border-color: var(--danger-dim); color: var(--danger); }
  .detail-actions button:nth-child(3):hover { border-color: var(--accent-dim); color: var(--accent); }

  .detail-actions button:active { transform: scale(0.97); }

  .detail-empty {
    color: var(--dim);
    font-size: 12px;
    font-style: italic;
  }

  /* ── Responsive ── */
  @media (max-width: 640px) {
    .container { padding: 12px; }
    .header { gap: 14px; padding: 14px 0 18px; }
    .header-title { font-size: 18px; }
    .cards { grid-template-columns: 1fr; gap: 12px; }
    .card { padding: 14px 16px; }
    .journal-entries { max-height: 260px; }
    .actions { gap: 8px; }
    .action-btn { padding: 8px 14px; }
    .detail-panel { width: 100%; right: -105%; }
    .detail-grid { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>
<div class="container">

  <!-- Header -->
  <div class="header">
    <div class="dna-helix">
      <svg viewBox="0 0 40 80" xmlns="http://www.w3.org/2000/svg">
        <!-- bonds (rungs) -->
        <line class="bond" x1="6" y1="4"  x2="34" y2="4"  />
        <line class="bond" x1="14" y1="16" x2="26" y2="16" />
        <line class="bond" x1="6" y1="28"  x2="34" y2="28"  />
        <line class="bond" x1="14" y1="40" x2="26" y2="40" />
        <line class="bond" x1="6" y1="52"  x2="34" y2="52"  />
        <line class="bond" x1="14" y1="64" x2="26" y2="64" />
        <line class="bond" x1="6" y1="76"  x2="34" y2="76"  />
        <!-- left strand -->
        <path class="strand-left" d="M6,4 C6,10 14,14 14,16 C14,22 6,26 6,28 C6,34 14,38 14,40 C14,46 6,50 6,52 C6,58 14,62 14,64 C14,70 6,74 6,76" />
        <!-- right strand -->
        <path class="strand-right" d="M34,4 C34,10 26,14 26,16 C26,22 34,26 34,28 C34,34 26,38 26,40 C26,46 34,50 34,52 C34,58 26,62 26,64 C26,70 34,74 34,76" />
        <!-- left nodes -->
        <circle class="node" cx="6" cy="4" r="3" />
        <circle class="node" cx="14" cy="16" r="2.5" />
        <circle class="node" cx="6" cy="28" r="3" />
        <circle class="node" cx="14" cy="40" r="2.5" />
        <circle class="node" cx="6" cy="52" r="3" />
        <circle class="node" cx="14" cy="64" r="2.5" />
        <circle class="node" cx="6" cy="76" r="3" />
        <!-- right nodes -->
        <circle class="node-right" cx="34" cy="4" r="3" />
        <circle class="node-right" cx="26" cy="16" r="2.5" />
        <circle class="node-right" cx="34" cy="28" r="3" />
        <circle class="node-right" cx="26" cy="40" r="2.5" />
        <circle class="node-right" cx="34" cy="52" r="3" />
        <circle class="node-right" cx="26" cy="64" r="2.5" />
        <circle class="node-right" cx="34" cy="76" r="3" />
      </svg>
    </div>
    <div class="header-text">
      <div class="header-title">organisms</div>
      <div class="header-stats" id="header-stats"></div>
    </div>
    <div class="header-live">
      <div class="live-dot"></div>
      live
    </div>
  </div>

  <!-- Organism Cards -->
  <div class="cards" id="cards"></div>

  <!-- Journal Panel -->
  <div class="journal-panel" id="journal-panel" style="display:none;">
    <div class="journal-header">
      <div class="journal-title">journal — <span id="journal-name"></span></div>
      <div class="journal-live">
        <div class="live-dot"></div>
        live
      </div>
    </div>
    <div class="journal-entries" id="journal-entries"></div>
  </div>

  <!-- Actions -->
  <div class="actions" id="actions">
    <button class="action-btn start" data-action="start">start</button>
    <button class="action-btn stop" data-action="stop">stop</button>
    <button class="action-btn evolve" data-action="evolve">evolve</button>
  </div>

</div>

<!-- Detail Panel -->
<div class="detail-overlay" id="detailOverlay" onclick="closeDetail()"></div>
<div class="detail-panel" id="detailPanel">
  <button class="close-btn" onclick="closeDetail()">&times;</button>
  <div id="detailContent"></div>
</div>

<!-- Toast -->
<div class="toast" id="toast"></div>

<!-- WS status -->
<div class="ws-status">
  <div class="ws-dot" id="ws-dot"></div>
  <span id="ws-label">connecting</span>
</div>

<script>
(function() {
  let colony = [];
  let selectedName = null;
  let journalCache = {};
  let ws = null;
  let wsRetryDelay = 1000;

  // ── DOM refs ──
  const cardsEl = document.getElementById('cards');
  const headerStats = document.getElementById('header-stats');
  const journalPanel = document.getElementById('journal-panel');
  const journalName = document.getElementById('journal-name');
  const journalEntries = document.getElementById('journal-entries');
  const toastEl = document.getElementById('toast');
  const wsDot = document.getElementById('ws-dot');
  const wsLabel = document.getElementById('ws-label');

  // ── Toast ──
  let toastTimeout = null;
  function showToast(msg, isError) {
    toastEl.textContent = msg;
    toastEl.className = 'toast show' + (isError ? ' error' : '');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { toastEl.className = 'toast'; }, 3000);
  }

  // ── Render colony ──
  function renderColony(data) {
    colony = data;
    const alive = data.filter(o => o.alive).length;
    const dormant = data.filter(o => !o.alive).length;

    let parts = [];
    if (alive > 0) parts.push('<span class="stat-alive">' + alive + ' alive</span>');
    if (dormant > 0) parts.push('<span class="stat-dormant">' + dormant + ' dormant</span>');
    headerStats.innerHTML = parts.join('<span class="stat-sep">&middot;</span>');

    if (data.length === 0) {
      cardsEl.innerHTML = '<div class="empty-state"><div class="helix-large">&#x25E6;&#x2500;&#x25E6;</div><p>no organisms found</p><p><code>organisms init "your mission"</code></p></div>';
      journalPanel.style.display = 'none';
      return;
    }

    // Auto-select first if none selected
    if (!selectedName || !data.find(o => o.name === selectedName)) {
      selectedName = data[0].name;
    }

    // Build cards — update in place to avoid flicker
    let html = '';
    for (const o of data) {
      const sel = o.name === selectedName;
      const cls = ['card', o.alive ? 'alive' : 'dormant', sel ? 'selected' : ''].filter(Boolean).join(' ');
      let agentsHtml = '';
      if (o.agents.length > 0) {
        agentsHtml = '<div class="card-agents">' + o.agents.map(a =>
          '<span class="agent-tag"><span class="helix">&#x25E6;&#xB7;&#x25E6;</span>' + esc(a) + '</span>'
        ).join('') + '</div>';
      }

      html += '<div class="' + cls + '" data-org="'+esc(o.name)+'"><div class="card-header">';
      html += '<div class="alive-dot ' + (o.alive ? 'on' : 'off') + '"></div>';
      html += '<div class="card-name">' + esc(o.name) + '</div>';
      if (o.alive && o.uptime) {
        html += '<div class="card-uptime">' + esc(o.uptime) + '</div>';
      } else if (!o.alive) {
        html += '<div class="card-dormant-label">dormant</div>';
      }
      html += '</div>';
      html += '<div class="card-meta"><div class="card-thoughts"><span>' + o.thoughts + '</span> thoughts</div></div>';
      html += agentsHtml;
      if (o.lastThought) {
        html += '<div class="card-thought">"' + esc(o.lastThought) + '"</div>';
      }
      html += '</div>';
    }
    cardsEl.innerHTML = html;

    // Update journal
    fetchJournal(selectedName);
  }

  function esc(s) {
    if (!s) return '';
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Journal ──
  function fetchJournal(name) {
    journalPanel.style.display = 'block';
    journalName.textContent = name;

    fetch('/api/journal/' + encodeURIComponent(name))
      .then(r => r.json())
      .then(entries => {
        const prevCount = journalCache[name] ? journalCache[name].length : 0;
        journalCache[name] = entries;

        let html = '';
        if (entries.length === 0) {
          html = '<div class="journal-empty">no thoughts yet</div>';
        } else {
          for (let i = 0; i < entries.length; i++) {
            const e = entries[i];
            const isNew = i >= prevCount && prevCount > 0;
            html += '<div class="journal-entry' + (isNew ? ' new' : '') + '">';
            html += '<div class="journal-time">' + esc(e.time) + '</div>';
            html += '<div class="journal-text">' + esc(e.text) + '</div>';
            html += '</div>';
          }
        }
        journalEntries.innerHTML = html;
        // Auto-scroll to bottom
        journalEntries.scrollTop = journalEntries.scrollHeight;
      })
      .catch(() => {});
  }

  // ── Detail Panel ──
  let currentDetail = null;
  const detailPanel = document.getElementById('detailPanel');
  const detailOverlay = document.getElementById('detailOverlay');
  const detailContent = document.getElementById('detailContent');

  window.closeDetail = function() {
    detailPanel.classList.remove('open');
    detailOverlay.classList.remove('open');
    currentDetail = null;
  };

  window.openDetail = function(name) {
    currentDetail = name;
    selectedName = name;
    renderColony(colony);
    detailContent.innerHTML = '<div style="color:var(--dim);padding:40px;text-align:center;">loading...</div>';
    detailPanel.classList.add('open');
    detailOverlay.classList.add('open');
    fetch('/api/organism/' + encodeURIComponent(name))
      .then(function(r) { return r.json(); })
      .then(function(data) { renderDetail(data); })
      .catch(function() {
        detailContent.innerHTML = '<div style="color:var(--danger);padding:40px;text-align:center;">failed to load</div>';
      });
  };

  function renderDetail(data) {
    var h = '';

    // Header
    h += '<div class="detail-header">';
    h += '<span class="detail-status ' + (data.alive ? 'on' : 'off') + '">&#x25CF;</span>';
    h += '<h2 class="detail-name">' + esc(data.name) + '</h2>';
    if (data.dnaVersion) h += '<span class="detail-dna">' + esc(data.dnaVersion) + '</span>';
    if (data.uptime) h += '<span class="detail-uptime">' + esc(data.uptime) + '</span>';
    h += '</div>';

    // State + heartbeat
    if (data.state || data.lastHeartbeat) {
      h += '<div class="detail-state">';
      if (data.state) h += '<span>' + esc(data.state) + '</span>';
      if (data.lastHeartbeat) h += ' &mdash; last heartbeat: ' + esc(data.lastHeartbeat);
      h += '</div>';
    }

    // Mission
    h += '<hr class="detail-divider">';
    h += '<div class="detail-section"><h3>mission</h3>';
    h += '<p class="detail-mission">' + esc(data.mission || 'no mission defined') + '</p>';
    h += '</div>';

    // Knowledge + Agents grid
    h += '<hr class="detail-divider">';
    h += '<div class="detail-grid">';

    // Knowledge
    h += '<div class="detail-section"><h3>knowledge</h3>';
    h += '<div class="knowledge-stats">';
    h += '<div><span class="stat-num">' + (data.knowledge.lessons || 0) + '</span>lessons</div>';
    h += '<div><span class="stat-num">' + (data.knowledge.patterns || 0) + '</span>patterns</div>';
    h += '<div><span class="stat-num">' + (data.knowledge.failures || 0) + '</span>failures</div>';
    h += '</div>';
    if (data.knowledge.lessonsList && data.knowledge.lessonsList.length > 0) {
      h += '<div class="knowledge-items">';
      for (var i = 0; i < data.knowledge.lessonsList.length; i++) {
        h += '<div>' + esc(data.knowledge.lessonsList[i]) + '</div>';
      }
      h += '</div>';
    }
    if (data.knowledge.playbookList && data.knowledge.playbookList.length > 0) {
      h += '<div class="knowledge-items" style="margin-top:6px;">';
      for (var i = 0; i < data.knowledge.playbookList.length; i++) {
        h += '<div>' + esc(data.knowledge.playbookList[i]) + '</div>';
      }
      h += '</div>';
    }
    h += '</div>';

    // Agents
    h += '<div class="detail-section"><h3>agents</h3>';
    if (data.agents && data.agents.length > 0) {
      h += '<div class="agent-list">';
      for (var i = 0; i < data.agents.length; i++) {
        var a = data.agents[i];
        h += '<div class="agent-item">';
        h += '<span class="agent-sym">&#x25E6;&#xB7;&#x25E6;</span>';
        h += '<span><span class="agent-name">' + esc(a.name) + '</span>';
        if (a.description) h += ' <span class="agent-desc">&mdash; ' + esc(a.description) + '</span>';
        h += '</span></div>';
      }
      h += '</div>';
    } else {
      h += '<div class="detail-empty">no agents spawned</div>';
    }
    h += '</div>';
    h += '</div>'; // end grid

    // Priorities
    if (data.priorities && data.priorities.length > 0) {
      h += '<hr class="detail-divider">';
      h += '<div class="detail-section"><h3>priorities</h3>';
      h += '<ol class="priorities-list">';
      for (var i = 0; i < data.priorities.length; i++) {
        h += '<li>' + esc(data.priorities[i]) + '</li>';
      }
      h += '</ol></div>';
    }

    // Studies
    if (data.studies && data.studies.length > 0) {
      h += '<hr class="detail-divider">';
      h += '<div class="detail-section"><h3>studies</h3>';
      h += '<div class="studies-list">';
      for (var i = 0; i < data.studies.length; i++) {
        h += '<div>' + esc(data.studies[i]) + '</div>';
      }
      h += '</div></div>';
    }

    // Invariants
    if (data.invariants && data.invariants.length > 0) {
      h += '<hr class="detail-divider">';
      h += '<div class="detail-section"><h3>invariants</h3>';
      h += '<ul class="invariants-list">';
      for (var i = 0; i < data.invariants.length; i++) {
        h += '<li>' + esc(data.invariants[i]) + '</li>';
      }
      h += '</ul></div>';
    }

    // Journal
    if (data.journal && data.journal.length > 0) {
      h += '<hr class="detail-divider">';
      h += '<div class="detail-section"><h3>recent journal</h3>';
      h += '<div class="detail-journal">';
      for (var i = 0; i < data.journal.length; i++) {
        var e = data.journal[i];
        h += '<div class="dj-entry"><span class="dj-time">' + esc(e.time) + '</span><span class="dj-text">' + esc(e.text) + '</span></div>';
      }
      h += '</div></div>';
    }

    // Actions
    h += '<div class="detail-actions">';
    h += '<button onclick="detailAction(\\'' + esc(data.name) + '\\', \\'start\\')">start</button>';
    h += '<button onclick="detailAction(\\'' + esc(data.name) + '\\', \\'stop\\')">stop</button>';
    h += '<button onclick="detailAction(\\'' + esc(data.name) + '\\', \\'evolve\\')">evolve</button>';
    h += '</div>';

    detailContent.innerHTML = h;
    detailPanel.scrollTop = 0;
  }

  window.detailAction = function(name, action) {
    fetch('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, action: action })
    })
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res.ok) showToast(action + ': ' + name, false);
      else showToast(res.error || 'failed', true);
    })
    .catch(function() { showToast('request failed', true); });
  };

  // ── Select organism (event delegation) ──
  cardsEl.addEventListener('click', function(e) {
    var card = e.target.closest('[data-org]');
    if (!card) return;
    var name = card.getAttribute('data-org');
    selectedName = name;
    renderColony(colony);
    openDetail(name);
  });

  // ── Actions (event delegation) ──
  document.getElementById('actions').addEventListener('click', function(e) {
    var btn = e.target.closest('.action-btn');
    if (!btn || !selectedName) return;
    var action = btn.getAttribute('data-action');
    if (!action) return;
    fetch('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: selectedName, action: action })
    })
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res.ok) showToast(action + ': ' + selectedName, false);
      else showToast(res.error || 'failed', true);
    })
    .catch(function() { showToast('request failed', true); });
  });

  // ── WebSocket ──
  function connectWS() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(proto + '//' + location.host + '/ws');

    ws.onopen = function() {
      wsDot.className = 'ws-dot connected';
      wsLabel.textContent = 'connected';
      wsRetryDelay = 1000;
    };

    ws.onmessage = function(e) {
      try {
        const data = JSON.parse(e.data);
        renderColony(data);
      } catch {}
    };

    ws.onclose = function() {
      wsDot.className = 'ws-dot disconnected';
      wsLabel.textContent = 'reconnecting';
      setTimeout(connectWS, wsRetryDelay);
      wsRetryDelay = Math.min(wsRetryDelay * 1.5, 10000);
    };

    ws.onerror = function() {
      ws.close();
    };
  }

  // ── Keyboard ──
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && currentDetail) closeDetail();
  });

  // ── Init ──
  fetch('/api/colony')
    .then(r => r.json())
    .then(data => renderColony(data))
    .catch(() => {});

  connectWS();
})();
</script>
</body>
</html>`;

// ── Server ──
const PORT = 3333;

// Track connected websockets
const wsClients = new Set<any>();

let pushInterval: ReturnType<typeof setInterval> | null = null;

const server = Bun.serve({
  port: PORT,
  routes: {
    "/": () => new Response(HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } }),
    "/api/colony": () => Response.json(getColonyData()),
    "/api/journal/:name": (req) => {
      const name = req.params.name;
      return Response.json(getJournalEntries(name));
    },
    "/api/organism/:name": (req) => {
      const name = req.params.name;
      const detail = getOrganismDetail(name);
      if (!detail) return Response.json({ error: "organism not found" }, { status: 404 });
      return Response.json(detail);
    },
  },
  fetch(req, server) {
    const url = new URL(req.url);

    // WebSocket upgrade
    if (url.pathname === "/ws") {
      const success = server.upgrade(req);
      if (success) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    // POST /api/action
    if (url.pathname === "/api/action" && req.method === "POST") {
      return req.json().then((body: any) => {
        const { name, action, concern } = body;
        if (!name || !action) {
          return Response.json({ ok: false, error: "missing name or action" }, { status: 400 });
        }

        // Find the organism path
        const registry = loadRegistry();
        const orgPath = Object.keys(registry).find(p => basename(p) === name);
        if (!orgPath) {
          return Response.json({ ok: false, error: "organism not found" }, { status: 404 });
        }

        const sessionName = pathToSession(orgPath);

        try {
          switch (action) {
            case "start": {
              // Check if already alive
              if (isSessionAlive(sessionName)) {
                return Response.json({ ok: true, message: "already alive" });
              }
              execSync(`cd "${orgPath}" && organisms start`, { stdio: "ignore", timeout: 10000 });
              return Response.json({ ok: true });
            }
            case "stop": {
              if (!isSessionAlive(sessionName)) {
                return Response.json({ ok: true, message: "already dormant" });
              }
              execSync(`cd "${orgPath}" && organisms stop`, { stdio: "ignore", timeout: 10000 });
              return Response.json({ ok: true });
            }
            case "evolve": {
              if (!isSessionAlive(sessionName)) {
                return Response.json({ ok: false, error: "organism dormant" }, { status: 400 });
              }
              const evolveArgs = concern ? `"${concern.replace(/"/g, '')}"` : "";
              execSync(`cd "${orgPath}" && organisms evolve ${evolveArgs}`, { stdio: "ignore", timeout: 10000 });
              return Response.json({ ok: true });
            }
            default:
              return Response.json({ ok: false, error: "unknown action" }, { status: 400 });
          }
        } catch (e: any) {
          return Response.json({ ok: false, error: e.message || "command failed" }, { status: 500 });
        }
      }).catch(() => {
        return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
      });
    }

    return new Response("not found", { status: 404 });
  },
  websocket: {
    open(ws) {
      wsClients.add(ws);
      // Send initial data
      try {
        ws.send(JSON.stringify(getColonyData()));
      } catch {}
    },
    message(_ws, _message) {
      // No client messages expected
    },
    close(ws) {
      wsClients.delete(ws);
    },
  },
});

// Push updates every 3 seconds
pushInterval = setInterval(() => {
  if (wsClients.size === 0) return;
  const data = JSON.stringify(getColonyData());
  for (const ws of wsClients) {
    try { ws.send(data); } catch { wsClients.delete(ws); }
  }
}, 3000);

console.log(`organisms web dashboard → http://localhost:${PORT}`);

// Open browser
try {
  execSync(`xdg-open http://localhost:${PORT} 2>/dev/null`, { stdio: "ignore" });
} catch {
  try {
    execSync(`open http://localhost:${PORT} 2>/dev/null`, { stdio: "ignore" });
  } catch {}
}

// Graceful shutdown
process.on("SIGINT", () => {
  if (pushInterval) clearInterval(pushInterval);
  server.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  if (pushInterval) clearInterval(pushInterval);
  server.stop();
  process.exit(0);
});
