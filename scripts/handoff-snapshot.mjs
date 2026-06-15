#!/usr/bin/env node
/**
 * PreCompact hook: write a fresh git snapshot into SESSION-HANDOFF.md so the next
 * session has up-to-date continuity state even if the model didn't refresh it before
 * the context compacted. Best-effort and non-blocking — always exits 0 so it can
 * never stall a compaction. Reads the PreCompact payload on stdin (for the trigger
 * reason) but does not require it.
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const START = '<!-- AUTO-SNAPSHOT:START -->';
const END = '<!-- AUTO-SNAPSHOT:END -->';

function sh(cmd, cwd) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

try {
  // Trigger reason from the PreCompact payload (manual | auto), if present.
  let trigger = 'unknown';
  try {
    const raw = readFileSync(0, 'utf8');
    if (raw && raw.trim()) {
      const j = JSON.parse(raw);
      trigger = j.trigger || j.hook_event_name || 'unknown';
    }
  } catch {
    /* no stdin — fine */
  }

  const root = sh('git rev-parse --show-toplevel', process.cwd()) || process.cwd();
  const branch = sh('git rev-parse --abbrev-ref HEAD', root) || '(unknown)';
  const commits = sh('git log --oneline -5', root) || '(no commits)';
  const status = sh('git status --short', root);
  const ts = new Date().toISOString();

  const block = [
    START,
    `## 🤖 Auto-snapshot at compaction`,
    `_Written by scripts/handoff-snapshot.mjs on PreCompact (trigger=${trigger}) at ${ts}._`,
    '',
    `- **branch:** \`${branch}\``,
    `- **last 5 commits:**`,
    '```',
    commits,
    '```',
    `- **git status (uncommitted):**`,
    '```',
    status || '(working tree clean)',
    '```',
    END,
  ].join('\n');

  const file = join(root, 'SESSION-HANDOFF.md');
  if (existsSync(file)) {
    const cur = readFileSync(file, 'utf8');
    const re = new RegExp(`${START}[\\s\\S]*?${END}`);
    const next = re.test(cur) ? cur.replace(re, block) : `${cur.replace(/\s*$/, '')}\n\n${block}\n`;
    writeFileSync(file, next);
  } else {
    writeFileSync(
      file,
      `# SESSION HANDOFF — Aegis (AI Governance)\n\n> Local continuity scratch (gitignored). Auto-snapshot below is refreshed on every compaction.\n\n${block}\n`,
    );
  }
} catch {
  /* never block a compaction */
}
process.exit(0);
