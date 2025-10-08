import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { ScriptClassifier } from '../../src/script-classifier.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('ScriptClassifier', () => {
  let classifier: ScriptClassifier;
  let testDir: string;

  beforeEach(async () => {
    classifier = new ScriptClassifier();
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'script-test-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  test('should classify build scripts', async () => {
    // Arrange
    const scriptPath = path.join(testDir, 'build.sh');
    await fs.writeFile(scriptPath, '#!/bin/bash\nnpm run build\ntsc');

    // Act
    const result = await classifier.classifyScript(scriptPath);

    // Assert
    expect(result.type).toBe('build');
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  test('should classify test scripts', async () => {
    // Arrange
    const scriptPath = path.join(testDir, 'run-tests.sh');
    await fs.writeFile(scriptPath, '#!/bin/bash\nvitest run\njest');

    // Act
    const result = await classifier.classifyScript(scriptPath);

    // Assert
    expect(result.type).toBe('test');
  });

  test('should classify deploy scripts', async () => {
    // Arrange
    const scriptPath = path.join(testDir, 'deploy.sh');
    await fs.writeFile(
      scriptPath,
      '#!/bin/bash\nkubectl apply\ndocker push\naws s3 sync'
    );

    // Act
    const result = await classifier.classifyScript(scriptPath);

    // Assert
    expect(result.type).toBe('deploy');
  });

  test('should classify migration scripts', async () => {
    // Arrange
    const scriptPath = path.join(testDir, '001_migration.sql');
    await fs.writeFile(scriptPath, 'ALTER TABLE users ADD COLUMN email VARCHAR(255);');

    // Act
    const result = await classifier.classifyScript(scriptPath);

    // Assert
    expect(result.type).toBe('migration');
  });

  test('should classify utility scripts', async () => {
    // Arrange
    const scriptPath = path.join(testDir, 'helper.sh');
    await fs.writeFile(scriptPath, '#!/bin/bash\necho "utility"');

    // Act
    const result = await classifier.classifyScript(scriptPath);

    // Assert
    expect(result.type).toBe('utility');
  });

  test('should use filename for classification', async () => {
    // Arrange
    const scriptPath = path.join(testDir, 'build.js');
    await fs.writeFile(scriptPath, 'console.log("build");');

    // Act
    const result = await classifier.classifyScript(scriptPath);

    // Assert
    expect(result.type).toBe('build');
    expect(result.reasoning).toContain('Filename');
  });

  test('should detect shebang', async () => {
    // Arrange
    const scriptPath = path.join(testDir, 'script');
    await fs.writeFile(scriptPath, '#!/usr/bin/env python\nprint("hello")');

    // Act
    const result = await classifier.classifyScript(scriptPath);

    // Assert
    expect(result.reasoning).toContain('Script with shebang');
  });
});
