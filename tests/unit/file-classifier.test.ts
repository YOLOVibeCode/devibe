import { describe, test, expect } from 'vitest';
import { FileClassifier } from '../../src/file-classifier.js';

describe('FileClassifier', () => {
  let classifier: FileClassifier;

  beforeEach(() => {
    classifier = new FileClassifier();
  });

  describe('classify', () => {
    test('should classify TypeScript source files', async () => {
      // Act
      const result = await classifier.classify('src/index.ts');

      // Assert
      expect(result.category).toBe('source');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test('should classify JavaScript source files', async () => {
      // Act
      const result = await classifier.classify('app.js');

      // Assert
      expect(result.category).toBe('source');
    });

    test('should classify test files', async () => {
      // Act
      const result = await classifier.classify('test/my-test.test.ts');

      // Assert
      expect(result.category).toBe('test');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test('should classify spec files as tests', async () => {
      // Act
      const result = await classifier.classify('user.spec.js');

      // Assert
      expect(result.category).toBe('test');
    });

    test('should classify markdown as documentation', async () => {
      // Act
      const result = await classifier.classify('README.md');

      // Assert
      expect(result.category).toBe('documentation');
    });

    test('should classify config files', async () => {
      // Act
      const result = await classifier.classify('tsconfig.json');

      // Assert
      expect(result.category).toBe('config');
    });

    test('should classify shell scripts', async () => {
      // Act
      const result = await classifier.classify('deploy.sh');

      // Assert
      expect(result.category).toBe('script');
    });

    test('should classify Python scripts', async () => {
      // Act
      const result = await classifier.classify('script.py');

      // Assert
      expect(result.category).toBe('script');
    });

    test('should classify images as assets', async () => {
      // Act
      const result = await classifier.classify('logo.png');

      // Assert
      expect(result.category).toBe('asset');
    });

    test('should classify unknown files', async () => {
      // Act
      const result = await classifier.classify('random.xyz');

      // Assert
      expect(result.category).toBe('unknown');
      expect(result.confidence).toBeLessThan(0.5);
    });

    test('should use content for better classification', async () => {
      // Arrange
      const content = '#!/usr/bin/env node\nconsole.log("hello");';

      // Act
      const result = await classifier.classify('my-cli', content);

      // Assert
      expect(result.category).toBe('script');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test('should detect shebang in content', async () => {
      // Arrange
      const content = '#!/bin/bash\necho "test"';

      // Act
      const result = await classifier.classify('file', content);

      // Assert
      expect(result.category).toBe('script');
    });
  });

  describe('classifyBatch', () => {
    test('should classify multiple files', async () => {
      // Arrange
      const files = [
        'src/index.ts',
        'README.md',
        'test/app.test.ts',
        'config.json',
      ];

      // Act
      const results = await classifier.classifyBatch(files);

      // Assert
      expect(results).toHaveLength(4);
      expect(results[0].category).toBe('source');
      expect(results[1].category).toBe('documentation');
      expect(results[2].category).toBe('test');
      expect(results[3].category).toBe('config');
    });

    test('should handle empty array', async () => {
      // Act
      const results = await classifier.classifyBatch([]);

      // Assert
      expect(results).toHaveLength(0);
    });
  });
});
