const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const level = process.argv[2];
const allowedLevels = new Set(['patch', 'minor', 'major']);

if (!allowedLevels.has(level)) {
  console.error('Usage: node scripts/bump-version.cjs <patch|minor|major>');
  process.exit(1);
}

const versionPath = path.join(root, 'VERSION');
const packagePath = path.join(root, 'package.json');
const changelogPath = path.join(root, 'CHANGELOG.md');
const currentVersion = fs.readFileSync(versionPath, 'utf8').trim();
const parts = currentVersion.split('.').map(Number);

if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part) || part < 0)) {
  throw new Error(`Invalid semantic version: ${currentVersion}`);
}

if (level === 'major') {
  parts[0] += 1;
  parts[1] = 0;
  parts[2] = 0;
} else if (level === 'minor') {
  parts[1] += 1;
  parts[2] = 0;
} else {
  parts[2] += 1;
}

const nextVersion = parts.join('.');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
packageJson.version = nextVersion;

fs.writeFileSync(versionPath, `${nextVersion}\n`);
fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

const today = new Date().toISOString().slice(0, 10);
const changelog = fs.readFileSync(changelogPath, 'utf8');
const releaseHeading = `## [${nextVersion}] - ${today}\n\n- Describe the release changes here.\n`;
const updatedChangelog = changelog.replace(
  /## \[Unreleased\]\n/,
  `## [Unreleased]\n\n${releaseHeading}`,
);
fs.writeFileSync(changelogPath, updatedChangelog);

const pythonCommands = process.platform === 'win32' ? ['python', 'py'] : ['python3', 'python'];
let syncResult = null;
for (const command of pythonCommands) {
  syncResult = spawnSync(command, ['scripts/sync_project.py'], {
    cwd: root,
    encoding: 'utf8',
    stdio: 'inherit',
  });
  if (!syncResult.error) break;
}

if (!syncResult || syncResult.error || syncResult.status !== 0) {
  throw new Error('Version files were updated, but project synchronization failed.');
}

console.log(`Version bumped from ${currentVersion} to ${nextVersion}.`);
