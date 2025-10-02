import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { SecretScanner } from '../../src/secret-scanner.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('SecretScanner', () => {
  let testDir: string;
  let scanner: SecretScanner;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unvibe-secret-test-'));
    scanner = new SecretScanner();
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('scanFiles', () => {
    test('should detect AWS access key', async () => {
      // Arrange
      const filePath = path.join(testDir, 'config.js');
      await fs.writeFile(
        filePath,
        'const key = "AKIAIOSFODNN7EXAMPLE";'
      );

      // Act
      const result = await scanner.scanFiles([filePath]);

      // Assert
      expect(result.filesScanned).toBe(1);
      expect(result.secretsFound).toBe(1);
      expect(result.findings[0].type).toBe('AWS Access Key ID');
      expect(result.findings[0].severity).toBe('critical');
    });

    test('should detect generic API key', async () => {
      // Arrange
      const filePath = path.join(testDir, 'app.js');
      await fs.writeFile(
        filePath,
        'const apiKey = "sk_live_51HnqYKHr8zGvB7xKV5qH6kP8";'
      );

      // Act
      const result = await scanner.scanFiles([filePath]);

      // Assert
      expect(result.secretsFound).toBeGreaterThan(0);
      expect(result.findings.some((f) => f.severity === 'high' || f.severity === 'critical')).toBe(true);
    });

    test('should detect private keys', async () => {
      // Arrange
      const filePath = path.join(testDir, 'key.pem');
      await fs.writeFile(
        filePath,
        '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----'
      );

      // Act
      const result = await scanner.scanFiles([filePath]);

      // Assert
      expect(result.secretsFound).toBeGreaterThan(0);
      expect(result.findings[0].type).toContain('Private Key');
      expect(result.findings[0].severity).toBe('critical');
    });

    test('should truncate secret values in context', async () => {
      // Arrange
      const secret = 'sk_live_51HnqYKHr8zGvB7xKV5qH6kP8mN9jF4bC2aE1dA0';
      const filePath = path.join(testDir, 'payment.js');
      await fs.writeFile(filePath, `const key = "${secret}";`);

      // Act
      const result = await scanner.scanFiles([filePath]);

      // Assert
      const finding = result.findings[0];
      expect(finding.context).not.toContain(secret);
      expect(finding.context.length).toBeLessThan(100);
    });

    test('should return empty result for clean files', async () => {
      // Arrange
      const filePath = path.join(testDir, 'clean.js');
      await fs.writeFile(
        filePath,
        'function hello() { console.log("Hello World"); }'
      );

      // Act
      const result = await scanner.scanFiles([filePath]);

      // Assert
      expect(result.filesScanned).toBe(1);
      expect(result.secretsFound).toBe(0);
      expect(result.findings).toHaveLength(0);
    });

    test('should provide correct summary counts', async () => {
      // Arrange
      const file1 = path.join(testDir, 'config1.js');
      const file2 = path.join(testDir, 'config2.js');
      await fs.writeFile(file1, 'const key = "AKIAIOSFODNN7EXAMPLE";');
      await fs.writeFile(
        file2,
        '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----'
      );

      // Act
      const result = await scanner.scanFiles([file1, file2]);

      // Assert
      expect(result.filesScanned).toBe(2);
      expect(result.secretsFound).toBeGreaterThanOrEqual(2);
      expect(result.summary.critical).toBeGreaterThan(0);
      expect(
        result.summary.critical +
          result.summary.high +
          result.summary.medium +
          result.summary.low
      ).toBe(result.secretsFound);
    });

    test('should scan multiple files quickly', async () => {
      // Arrange
      const files: string[] = [];
      for (let i = 0; i < 10; i++) {
        const filePath = path.join(testDir, `file${i}.js`);
        await fs.writeFile(
          filePath,
          `const config = { value: "test${i}" };`
        );
        files.push(filePath);
      }

      // Act
      const start = Date.now();
      const result = await scanner.scanFiles(files);
      const duration = Date.now() - start;

      // Assert
      expect(result.filesScanned).toBe(10);
      expect(duration).toBeLessThan(1000);
    });

    test('should handle non-existent files gracefully', async () => {
      // Arrange
      const nonExistent = path.join(testDir, 'does-not-exist.js');

      // Act & Assert
      await expect(scanner.scanFiles([nonExistent])).rejects.toThrow();
    });
  });

  describe('calculateEntropy', () => {
    test('should detect high entropy strings', () => {
      // Arrange
      const highEntropyString = 'aB3$xK9pQ7mL2nF5vR8wY6jH4cZ1tE0';

      // Act
      const entropy = scanner.calculateEntropy(highEntropyString);

      // Assert
      expect(entropy).toBeGreaterThan(4.0);
    });

    test('should detect low entropy strings', () => {
      // Arrange
      const lowEntropyString = 'aaaaaaaaaaaaaaaa';

      // Act
      const entropy = scanner.calculateEntropy(lowEntropyString);

      // Assert
      expect(entropy).toBeLessThan(1.0);
    });

    test('should classify typical secrets as high entropy', () => {
      // Arrange
      const apiKey = 'sk_live_51HnqYKHr8zGvB7xKV5qH6kP8';

      // Act
      const hasHigh = scanner.hasHighEntropy(apiKey);

      // Assert
      expect(hasHigh).toBe(true);
    });
  });
});
