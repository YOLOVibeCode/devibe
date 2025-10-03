import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { BuildDetector, NodeJSBuildValidator, DockerBuildValidator } from '../../src/build-validator.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('BuildDetector', () => {
  let testDir: string;
  let detector: BuildDetector;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unvibe-build-test-'));
    detector = new BuildDetector();
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  test('should detect Node.js project', async () => {
    // Arrange
    await fs.writeFile(path.join(testDir, 'package.json'), '{}');

    // Act
    const technologies = await detector.detect(testDir);

    // Assert
    expect(technologies).toContain('nodejs');
  });

  test('should detect Docker project', async () => {
    // Arrange
    await fs.writeFile(path.join(testDir, 'Dockerfile'), 'FROM node:18');

    // Act
    const technologies = await detector.detect(testDir);

    // Assert
    expect(technologies).toContain('docker');
  });

  test('should detect Python project', async () => {
    // Arrange
    await fs.writeFile(path.join(testDir, 'setup.py'), '');

    // Act
    const technologies = await detector.detect(testDir);

    // Assert
    expect(technologies).toContain('python');
  });

  test('should detect Go project', async () => {
    // Arrange
    await fs.writeFile(path.join(testDir, 'go.mod'), '');

    // Act
    const technologies = await detector.detect(testDir);

    // Assert
    expect(technologies).toContain('go');
  });

  test('should detect multiple technologies', async () => {
    // Arrange
    await fs.writeFile(path.join(testDir, 'package.json'), '{}');
    await fs.writeFile(path.join(testDir, 'Dockerfile'), 'FROM node:18');

    // Act
    const technologies = await detector.detect(testDir);

    // Assert
    expect(technologies).toContain('nodejs');
    expect(technologies).toContain('docker');
  });

  test('should return empty array for unknown project', async () => {
    // Act
    const technologies = await detector.detect(testDir);

    // Assert
    expect(technologies).toHaveLength(0);
  });
});

describe('NodeJSBuildValidator', () => {
  let testDir: string;
  let validator: NodeJSBuildValidator;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unvibe-node-test-'));
    validator = new NodeJSBuildValidator();
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  test('should validate when package.json exists', async () => {
    // Arrange
    await fs.writeFile(path.join(testDir, 'package.json'), '{}');

    // Act
    const canValidate = await validator.canValidate(testDir);

    // Assert
    expect(canValidate).toBe(true);
  });

  test('should not validate when package.json missing', async () => {
    // Act
    const canValidate = await validator.canValidate(testDir);

    // Assert
    expect(canValidate).toBe(false);
  });

  test('should run npm build successfully', async () => {
    // Arrange
    await fs.writeFile(
      path.join(testDir, 'package.json'),
      JSON.stringify({
        name: 'test',
        scripts: { build: 'echo "Build successful"' },
      })
    );

    // Act
    const result = await validator.runBuild(testDir);

    // Assert
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Build successful');
  });

  test('should handle build failures', async () => {
    // Arrange
    await fs.writeFile(
      path.join(testDir, 'package.json'),
      JSON.stringify({
        name: 'test',
        scripts: { build: 'exit 1' },
      })
    );

    // Act
    const result = await validator.runBuild(testDir);

    // Assert
    expect(result.success).toBe(false);
    expect(result.exitCode).not.toBe(0);
  });

  test('should measure build duration', async () => {
    // Arrange
    await fs.writeFile(
      path.join(testDir, 'package.json'),
      JSON.stringify({
        name: 'test',
        scripts: { build: 'echo "done"' },
      })
    );

    // Act
    const result = await validator.runBuild(testDir);

    // Assert
    expect(result.duration).toBeGreaterThan(0);
  });
});

describe('DockerBuildValidator', () => {
  let testDir: string;
  let validator: DockerBuildValidator;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unvibe-docker-test-'));
    validator = new DockerBuildValidator();
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  test('should validate when Dockerfile exists', async () => {
    // Arrange
    await fs.writeFile(path.join(testDir, 'Dockerfile'), 'FROM alpine');

    // Act
    const canValidate = await validator.canValidate(testDir);

    // Assert
    expect(canValidate).toBe(true);
  });

  test('should not validate when Dockerfile missing', async () => {
    // Act
    const canValidate = await validator.canValidate(testDir);

    // Assert
    expect(canValidate).toBe(false);
  });

  test('should validate Dockerfile syntax without building', async () => {
    // Arrange
    await fs.writeFile(
      path.join(testDir, 'Dockerfile'),
      'FROM alpine\nRUN echo "test"'
    );

    // Act
    const result = await validator.runBuild(testDir);

    // Assert
    // We only check syntax, not actual build, so it should succeed
    expect(result.success).toBe(true);
  });
});
