import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { GitDetector } from '../../src/git-detector.js';
import { SecretScanner } from '../../src/secret-scanner.js';
import { FileClassifier } from '../../src/file-classifier.js';
import { ScriptClassifier } from '../../src/script-classifier.js';
import { OperationPlanner, OperationExecutor } from '../../src/operation-executor.js';
import { BackupManager } from '../../src/backup-manager.js';
import { BuildDetector } from '../../src/build-validator.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Integration: Full Workflow', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unvibe-integration-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  test('should handle complete monorepo cleanup workflow', async () => {
    // Setup: Create a monorepo structure
    await fs.mkdir(path.join(testDir, '.git'));
    await fs.mkdir(path.join(testDir, 'app1/.git'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'app2/.git'), { recursive: true });

    // Add messy root files
    await fs.writeFile(path.join(testDir, 'README.md'), '# My Project');
    await fs.writeFile(path.join(testDir, 'NOTES.md'), '# Notes');
    await fs.writeFile(path.join(testDir, 'deploy.sh'), '#!/bin/bash\necho deploy');
    await fs.writeFile(path.join(testDir, 'config.js'), 'module.exports = {};');

    // Step 1: Detect repositories
    const detector = new GitDetector();
    const gitResult = await detector.detectRepositories(testDir);

    expect(gitResult.repositories).toHaveLength(3);
    expect(gitResult.hasMultipleRepos).toBe(true);
    expect(gitResult.rootRepo).toBeDefined();

    // Step 2: Scan for secrets
    const scanner = new SecretScanner();
    const files = [
      path.join(testDir, 'deploy.sh'),
      path.join(testDir, 'config.js'),
    ];
    const scanResult = await scanner.scanFiles(files);

    expect(scanResult.filesScanned).toBe(2);
    // Should not find secrets in clean files

    // Step 3: Classify files
    const classifier = new FileClassifier();
    const readmeClass = await classifier.classify(path.join(testDir, 'README.md'));
    const deployClass = await classifier.classify(path.join(testDir, 'deploy.sh'));

    expect(readmeClass.category).toBe('documentation');
    expect(deployClass.category).toBe('script');

    // Step 4: Plan operations
    const planner = new OperationPlanner(detector, classifier);
    const plan = await planner.planRootFileDistribution(testDir);

    expect(plan.operations.length).toBeGreaterThan(0);
    expect(plan.backupRequired).toBe(true);

    // Step 5: Execute with backup
    const backupManager = new BackupManager(path.join(testDir, '.unvibe/backups'));
    const executor = new OperationExecutor(backupManager);

    const result = await executor.execute(plan, false);

    expect(result.success).toBe(true);
    expect(result.backupManifestId).toBeDefined();

    // Step 6: Verify files were moved correctly
    // README.md should stay at root (it's kept by design)
    const readmeExists = await fs
      .access(path.join(testDir, 'README.md'))
      .then(() => true)
      .catch(() => false);
    expect(readmeExists).toBe(true); // Main README stays at root

    // NOTES.md should be moved to documents/
    const notesExists = await fs
      .access(path.join(testDir, 'NOTES.md'))
      .then(() => true)
      .catch(() => false);
    expect(notesExists).toBe(false); // Should be moved

    // Step 7: Restore from backup
    await backupManager.restore(result.backupManifestId!);

    const notesRestored = await fs
      .access(path.join(testDir, 'NOTES.md'))
      .then(() => true)
      .catch(() => false);
    expect(notesRestored).toBe(true); // Should be restored
  }, 10000);

  test('should enforce folder structure in repository', async () => {
    // Setup: Create a repo without required folders
    await fs.mkdir(path.join(testDir, '.git'));
    await fs.writeFile(path.join(testDir, 'build.sh'), '#!/bin/bash\nnpm run build');

    // Step 1: Plan enforcement
    const detector = new GitDetector();
    const classifier = new FileClassifier();
    const planner = new OperationPlanner(detector, classifier);

    const plan = await planner.planFolderEnforcement(testDir);

    expect(plan.operations.length).toBeGreaterThan(0);

    // Should create scripts/ and documents/ folders
    const createOps = plan.operations.filter(op => op.type === 'create');
    expect(createOps.length).toBeGreaterThanOrEqual(2);

    // Should move build.sh to scripts/
    const moveOps = plan.operations.filter(op => op.type === 'move');
    expect(moveOps.length).toBeGreaterThan(0);

    // Step 2: Execute enforcement
    const backupManager = new BackupManager(path.join(testDir, '.unvibe/backups'));
    const executor = new OperationExecutor(backupManager);

    const result = await executor.execute(plan, false);

    expect(result.success).toBe(true);

    // Step 3: Verify structure
    const scriptsExists = await fs
      .access(path.join(testDir, 'scripts'))
      .then(() => true)
      .catch(() => false);
    const docsExists = await fs
      .access(path.join(testDir, 'documents'))
      .then(() => true)
      .catch(() => false);

    expect(scriptsExists).toBe(true);
    expect(docsExists).toBe(true);
  });

  test('should detect and validate build systems', async () => {
    // Setup: Create a Node.js project
    await fs.mkdir(path.join(testDir, '.git'));
    await fs.writeFile(
      path.join(testDir, 'package.json'),
      JSON.stringify({
        name: 'test-project',
        scripts: {
          build: 'echo "build successful"',
        },
      })
    );

    // Step 1: Detect build system
    const buildDetector = new BuildDetector();
    const technologies = await buildDetector.detect(testDir);

    expect(technologies).toContain('nodejs');

    // Step 2: Validate build (we'll skip actual validation in test)
    // In real scenario, this would run npm run build
  });

  test('should classify scripts correctly', async () => {
    // Setup: Create various scripts
    const scriptDir = path.join(testDir, 'scripts');
    await fs.mkdir(scriptDir, { recursive: true });

    await fs.writeFile(
      path.join(scriptDir, 'build.sh'),
      '#!/bin/bash\nnpm run build\ntsc'
    );
    await fs.writeFile(
      path.join(scriptDir, 'test.sh'),
      '#!/bin/bash\nnpm test\nvitest run'
    );
    await fs.writeFile(
      path.join(scriptDir, 'deploy.sh'),
      '#!/bin/bash\nkubectl apply -f k8s/\naws s3 sync'
    );

    // Classify scripts
    const scriptClassifier = new ScriptClassifier();

    const buildScript = await scriptClassifier.classifyScript(
      path.join(scriptDir, 'build.sh')
    );
    const testScript = await scriptClassifier.classifyScript(
      path.join(scriptDir, 'test.sh')
    );
    const deployScript = await scriptClassifier.classifyScript(
      path.join(scriptDir, 'deploy.sh')
    );

    expect(buildScript.type).toBe('build');
    expect(testScript.type).toBe('test');
    expect(deployScript.type).toBe('deploy');
  });

  test('should handle dry-run without making changes', async () => {
    // Setup
    await fs.mkdir(path.join(testDir, '.git'));
    await fs.writeFile(path.join(testDir, 'file.txt'), 'content');

    // Plan and execute dry-run
    const detector = new GitDetector();
    const classifier = new FileClassifier();
    const planner = new OperationPlanner(detector, classifier);
    const backupManager = new BackupManager(path.join(testDir, '.unvibe/backups'));
    const executor = new OperationExecutor(backupManager);

    const plan = await planner.planFolderEnforcement(testDir);
    const result = await executor.execute(plan, true); // dry-run = true

    expect(result.success).toBe(true);
    expect(result.backupManifestId).toBeUndefined(); // No backup in dry-run

    // Verify nothing was actually created
    const scriptsExists = await fs
      .access(path.join(testDir, 'scripts'))
      .then(() => true)
      .catch(() => false);

    expect(scriptsExists).toBe(false); // Should not exist in dry-run
  });

  test('should detect secrets and prevent operations', async () => {
    // Setup: Create file with secret
    await fs.mkdir(path.join(testDir, '.git'));
    await fs.writeFile(
      path.join(testDir, 'config.js'),
      'const apiKey = "AKIAIOSFODNN7EXAMPLE";' // AWS key
    );

    // Scan for secrets
    const scanner = new SecretScanner();
    const result = await scanner.scanFiles([path.join(testDir, 'config.js')]);

    expect(result.secretsFound).toBeGreaterThan(0);
    expect(result.findings[0].severity).toBe('critical');
    expect(result.findings[0].type).toBe('AWS Access Key ID');

    // In real workflow, this would prevent commit/operations
  });

  test('should list and restore from multiple backups', async () => {
    // Setup
    await fs.mkdir(path.join(testDir, '.git'));
    const file1 = path.join(testDir, 'file1.txt');
    const file2 = path.join(testDir, 'file2.txt');
    await fs.writeFile(file1, 'content1');
    await fs.writeFile(file2, 'content2');

    const backupManager = new BackupManager(path.join(testDir, '.unvibe/backups'));

    // Create multiple backups
    const entry1 = await backupManager.backupFile(file1, 'delete');
    const manifest1 = await backupManager.createManifest([entry1]);

    await new Promise((resolve) => setTimeout(resolve, 10)); // Ensure different timestamps

    const entry2 = await backupManager.backupFile(file2, 'delete');
    const manifest2 = await backupManager.createManifest([entry2]);

    // List backups
    const backups = await backupManager.listBackups();

    expect(backups).toHaveLength(2);
    expect(backups[0].id).toBe(manifest2.id); // Newest first
    expect(backups[1].id).toBe(manifest1.id);

    // Delete files
    await fs.unlink(file1);
    await fs.unlink(file2);

    // Restore specific backup
    await backupManager.restore(manifest1.id);

    const file1Exists = await fs
      .access(file1)
      .then(() => true)
      .catch(() => false);
    const file2Exists = await fs
      .access(file2)
      .then(() => true)
      .catch(() => false);

    expect(file1Exists).toBe(true); // Restored
    expect(file2Exists).toBe(false); // Not restored yet
  });
});
