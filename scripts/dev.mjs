#!/usr/bin/env node
import { spawn } from 'node:child_process';
import process from 'node:process';
import readline from 'node:readline';

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

const commands = [
  { name: 'main', script: 'dev:main', color: '\x1b[32m' },
  { name: 'villa', script: 'dev:villastangsel', color: '\x1b[36m' },
  { name: 'industri', script: 'dev:industristangsel', color: '\x1b[35m' },
];

const children = [];
let shuttingDown = false;

function logLine(prefix, color, line) {
  const reset = '\x1b[0m';
  process.stdout.write(`${color}[${prefix}]${reset} ${line}\n`);
}

function startCommand({ name, script, color }) {
  const child = spawn(npmCmd, ['run', script], {
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: isWindows,
  });

  if (child.stdout) {
    const stdout = readline.createInterface({ input: child.stdout });
    stdout.on('line', (line) => logLine(name, color, line));
  }

  if (child.stderr) {
    const stderr = readline.createInterface({ input: child.stderr });
    stderr.on('line', (line) => logLine(name, color, line));
  }

  child.on('exit', (code) => {
    if (shuttingDown) return;
    shuttingDown = true;
    const exitCode = code ?? 0;
    logLine(name, color, `exited with code ${exitCode}`);
    for (const other of children) {
      if (other !== child && !other.killed) {
        other.kill('SIGTERM');
      }
    }
    process.exit(exitCode);
  });

  child.on('error', (error) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logLine(name, color, `failed to start: ${error.message}`);
    for (const other of children) {
      if (other !== child && !other.killed) {
        other.kill('SIGTERM');
      }
    }
    process.exit(1);
  });

  children.push(child);
}

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logLine('dev', '\x1b[33m', `received ${signal}, shutting down`);
  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
  setTimeout(() => process.exit(0), 100);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

for (const cmd of commands) {
  startCommand(cmd);
}
