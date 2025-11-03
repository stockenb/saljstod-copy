#!/usr/bin/env node
import { spawn } from 'node:child_process';
import Module from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const requireFromESM = Module.createRequire(import.meta.url);

const nextBin = path.resolve(__dirname, '../node_modules/next/dist/bin/next');
const command = process.argv[2] ?? 'dev';
const args = process.argv.slice(3);

function ensureFallbackTypes() {
  try {
    requireFromESM.resolve('@types/node/package.json', { paths: [process.cwd()] });
    return;
  } catch (error) {
    // continue below
  }

  const fallbackRoot = path.resolve(__dirname, '../types');
  const nodePathEntries = [fallbackRoot];
  if (process.env.NODE_PATH) {
    nodePathEntries.push(process.env.NODE_PATH);
  }
  const delimiter = process.platform === 'win32' ? ';' : ':';
  process.env.NODE_PATH = nodePathEntries.join(delimiter);

  // Ensure Node honors NODE_PATH when spawning the child process.
  Module._initPaths();

  const packageJson = path.join(fallbackRoot, '@types', 'node', 'package.json');
  if (!fs.existsSync(packageJson)) {
    process.stderr.write(
      'Missing fallback Node.js type definitions. Expected file at ' + packageJson + '\n',
    );
  }
}

ensureFallbackTypes();

if (!process.env.__NEXT_MANUAL_TYPESCRIPT_SETUP) {
  process.env.__NEXT_MANUAL_TYPESCRIPT_SETUP = '1';
}

const child = spawn(process.execPath, [nextBin, command, ...args], {
  env: process.env,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  process.stderr.write(`Failed to start Next.js: ${error.message}\n`);
  process.exit(1);
});
