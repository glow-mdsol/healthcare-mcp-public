#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const mode = (process.argv[2] || 'mcpb').toLowerCase();
const allowedModes = new Set(['dxt', 'mcpb', 'all']);

if (!allowedModes.has(mode)) {
  console.error('Invalid mode. Use one of: dxt, mcpb, all');
  process.exit(1);
}

const filesToPackage = [
  'manifest.json',
  'README.md',
  'README-DXT.md',
  'LICENSE',
  'CHANGELOG.md',
  'server'
];

for (const relPath of filesToPackage) {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`Required path is missing: ${relPath}`);
    process.exit(1);
  }
}

function zipOutput(outputFileName) {
  const outputPath = path.join(rootDir, outputFileName);
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }

  const args = [
    '-r',
    '-q',
    outputFileName,
    ...filesToPackage,
    '-x',
    '*/.DS_Store',
    '*/Thumbs.db',
    '*/.env',
    '*/.env.*',
    '*/.git/*',
    '*/.github/*',
    '*/.vscode/*',
    '*/.continue/*',
    'server/test-apis.js',
    'server/test-tools.js'
  ];

  const result = spawnSync('zip', args, {
    cwd: rootDir,
    stdio: 'inherit'
  });

  if (result.error) {
    console.error(`Failed to run zip: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`zip exited with status ${result.status}`);
    process.exit(result.status || 1);
  }

  const sizeBytes = fs.statSync(outputPath).size;
  const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(2);
  console.log(`Created ${outputFileName} (${sizeMb} MB)`);
}

if (mode === 'dxt' || mode === 'all') {
  zipOutput('healthcare-mcp.dxt');
}

if (mode === 'mcpb' || mode === 'all') {
  zipOutput('healthcare-mcp.mcpb');
}
