/**
 * Rule Pack Validator
 * Validates rule packs against the specification with clear, helpful error messages
 */

import type {
  RulePack,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from './rulepack-types.js';

export class RulePackValidator {
  /**
   * Validate a rule pack with detailed, helpful error messages
   */
  async validate(rulePack: unknown): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check if it's an object
    if (!rulePack || typeof rulePack !== 'object') {
      return {
        valid: false,
        errors: [{
          path: '$',
          message: 'Rule pack must be a valid object/JSON',
          code: 'INVALID_TYPE'
        }],
        warnings: []
      };
    }

    const pack = rulePack as any;

    // ========================================================================
    // Required Fields Validation
    // ========================================================================

    // 1. Schema version (REQUIRED)
    if (!pack.schema) {
      errors.push({
        path: '$.schema',
        message: 'Missing required field "schema". Expected: "devibe-rulepack/v1"',
        code: 'MISSING_SCHEMA'
      });
    } else if (pack.schema !== 'devibe-rulepack/v1') {
      errors.push({
        path: '$.schema',
        message: `Invalid schema version "${pack.schema}". Expected: "devibe-rulepack/v1"`,
        code: 'INVALID_SCHEMA_VERSION'
      });
    }

    // 2. Metadata (REQUIRED)
    if (!pack.metadata) {
      errors.push({
        path: '$.metadata',
        message: 'Missing required field "metadata". This field contains name, version, author, etc.',
        code: 'MISSING_METADATA'
      });
    } else {
      this.validateMetadata(pack.metadata, errors, warnings);
    }

    // ========================================================================
    // Optional Fields Validation (with helpful guidance)
    // ========================================================================

    // 3. Extends (optional, but validate if present)
    if (pack.extends !== undefined) {
      this.validateExtends(pack.extends, errors, warnings);
    }

    // 4. Structure (optional)
    if (pack.structure !== undefined) {
      this.validateStructure(pack.structure, errors, warnings);
    }

    // 5. Test Organization (optional)
    if (pack.testOrganization !== undefined) {
      this.validateTestOrganization(pack.testOrganization, errors, warnings);
    }

    // 6. File Classification (optional)
    if (pack.fileClassification !== undefined) {
      this.validateFileClassification(pack.fileClassification, errors, warnings);
    }

    // 7. Technologies (optional)
    if (pack.technologies !== undefined) {
      this.validateTechnologies(pack.technologies, errors, warnings);
    }

    // 8. Monorepo (optional)
    if (pack.monorepo !== undefined) {
      this.validateMonorepo(pack.monorepo, errors, warnings);
    }

    // 9. Naming Conventions (optional)
    if (pack.namingConventions !== undefined) {
      this.validateNamingConventions(pack.namingConventions, errors, warnings);
    }

    // 10. Git (optional)
    if (pack.git !== undefined) {
      this.validateGit(pack.git, errors, warnings);
    }

    // 11. CI/CD (optional)
    if (pack.cicd !== undefined) {
      this.validateCICD(pack.cicd, errors, warnings);
    }

    // 12. Custom Rules (optional)
    if (pack.customRules !== undefined) {
      this.validateCustomRules(pack.customRules, errors, warnings);
    }

    // 13. Ignore (optional)
    if (pack.ignore !== undefined) {
      this.validateIgnore(pack.ignore, errors, warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  // ========================================================================
  // Metadata Validation
  // ========================================================================

  private validateMetadata(
    metadata: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const path = '$.metadata';

    // Required fields
    if (!metadata.name) {
      errors.push({
        path: `${path}.name`,
        message: 'Missing required field "name". Example: "@mycompany/rulepack-name"',
        code: 'MISSING_NAME'
      });
    } else if (typeof metadata.name !== 'string') {
      errors.push({
        path: `${path}.name`,
        message: 'Field "name" must be a string',
        code: 'INVALID_NAME_TYPE'
      });
    } else if (!this.isValidPackageName(metadata.name)) {
      warnings.push({
        path: `${path}.name`,
        message: 'Package name should follow npm scoping convention: "@org/name" or "name"',
        code: 'INVALID_NAME_FORMAT'
      });
    }

    if (!metadata.version) {
      errors.push({
        path: `${path}.version`,
        message: 'Missing required field "version". Example: "1.0.0" (semver)',
        code: 'MISSING_VERSION'
      });
    } else if (!this.isValidSemver(metadata.version)) {
      errors.push({
        path: `${path}.version`,
        message: `Invalid version "${metadata.version}". Must be valid semver (e.g., "1.0.0", "2.1.3")`,
        code: 'INVALID_SEMVER'
      });
    }

    if (!metadata.author) {
      warnings.push({
        path: `${path}.author`,
        message: 'Recommended field "author" is missing. Helps users know who maintains this pack.',
        code: 'MISSING_AUTHOR'
      });
    }

    if (!metadata.description) {
      warnings.push({
        path: `${path}.description`,
        message: 'Recommended field "description" is missing. Helps users understand this pack\'s purpose.',
        code: 'MISSING_DESCRIPTION'
      });
    }

    // Optional fields with guidance
    if (metadata.tags && !Array.isArray(metadata.tags)) {
      errors.push({
        path: `${path}.tags`,
        message: 'Field "tags" must be an array of strings. Example: ["nodejs", "typescript"]',
        code: 'INVALID_TAGS_TYPE'
      });
    }

    if (metadata.license && typeof metadata.license !== 'string') {
      errors.push({
        path: `${path}.license`,
        message: 'Field "license" must be a string (SPDX identifier). Example: "MIT", "Apache-2.0"',
        code: 'INVALID_LICENSE_TYPE'
      });
    }

    if (metadata.homepage && !this.isValidUrl(metadata.homepage)) {
      warnings.push({
        path: `${path}.homepage`,
        message: 'Field "homepage" should be a valid URL',
        code: 'INVALID_HOMEPAGE_URL'
      });
    }

    if (metadata.repository && !this.isValidUrl(metadata.repository)) {
      warnings.push({
        path: `${path}.repository`,
        message: 'Field "repository" should be a valid URL',
        code: 'INVALID_REPOSITORY_URL'
      });
    }
  }

  // ========================================================================
  // Extends Validation
  // ========================================================================

  private validateExtends(
    extends_: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const path = '$.extends';

    if (!Array.isArray(extends_)) {
      errors.push({
        path,
        message: 'Field "extends" must be an array of strings. Example: ["@devibe/nodejs-standard"]',
        code: 'INVALID_EXTENDS_TYPE'
      });
      return;
    }

    extends_.forEach((item, index) => {
      if (typeof item !== 'string') {
        errors.push({
          path: `${path}[${index}]`,
          message: 'Each item in "extends" must be a string reference to another rule pack',
          code: 'INVALID_EXTENDS_ITEM'
        });
      }
    });

    // Check for circular references (self-reference)
    // Note: Full circular dependency check would require resolving all packs
  }

  // ========================================================================
  // Structure Validation
  // ========================================================================

  private validateStructure(
    structure: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const path = '$.structure';

    if (structure.enforced !== undefined && typeof structure.enforced !== 'boolean') {
      errors.push({
        path: `${path}.enforced`,
        message: 'Field "enforced" must be a boolean (true/false)',
        code: 'INVALID_ENFORCED_TYPE'
      });
    }

    if (structure.requiredFolders !== undefined) {
      this.validateFolderRules(structure.requiredFolders, `${path}.requiredFolders`, errors, warnings);
    }

    if (structure.optionalFolders !== undefined) {
      this.validateFolderRules(structure.optionalFolders, `${path}.optionalFolders`, errors, warnings);
    }

    if (structure.forbiddenAtRoot !== undefined) {
      this.validateForbiddenPatterns(structure.forbiddenAtRoot, `${path}.forbiddenAtRoot`, errors, warnings);
    }
  }

  private validateFolderRules(
    folders: any,
    path: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!Array.isArray(folders)) {
      errors.push({
        path,
        message: 'Folder rules must be an array. Example: [{ path: "src", description: "Source code" }]',
        code: 'INVALID_FOLDER_RULES_TYPE'
      });
      return;
    }

    folders.forEach((folder, index) => {
      const itemPath = `${path}[${index}]`;

      if (!folder.path) {
        errors.push({
          path: `${itemPath}.path`,
          message: 'Each folder rule must have a "path" field. Example: "src" or "tests/unit"',
          code: 'MISSING_FOLDER_PATH'
        });
      }

      if (!folder.description) {
        warnings.push({
          path: `${itemPath}.description`,
          message: 'Recommended: Add a "description" to explain this folder\'s purpose',
          code: 'MISSING_FOLDER_DESCRIPTION'
        });
      }

      if (folder.allowedCategories && !Array.isArray(folder.allowedCategories)) {
        errors.push({
          path: `${itemPath}.allowedCategories`,
          message: 'Field "allowedCategories" must be an array. Example: ["source", "test"]',
          code: 'INVALID_ALLOWED_CATEGORIES'
        });
      }
    });
  }

  private validateForbiddenPatterns(
    patterns: any,
    path: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!Array.isArray(patterns)) {
      errors.push({
        path,
        message: 'Forbidden patterns must be an array',
        code: 'INVALID_FORBIDDEN_TYPE'
      });
      return;
    }

    patterns.forEach((pattern, index) => {
      const itemPath = `${path}[${index}]`;

      if (typeof pattern === 'string') {
        // Simple string pattern is OK
        return;
      }

      if (!pattern.message) {
        warnings.push({
          path: `${itemPath}.message`,
          message: 'Recommended: Add a "message" to explain why this pattern is forbidden',
          code: 'MISSING_FORBIDDEN_MESSAGE'
        });
      }

      if (!pattern.pattern) {
        errors.push({
          path: `${itemPath}.pattern`,
          message: 'Forbidden pattern must have a "pattern" field. Example: "*.test.ts"',
          code: 'MISSING_FORBIDDEN_PATTERN'
        });
      }
    });
  }

  // ========================================================================
  // Test Organization Validation
  // ========================================================================

  private validateTestOrganization(
    testOrg: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const path = '$.testOrganization';

    if (testOrg.enabled !== undefined && typeof testOrg.enabled !== 'boolean') {
      errors.push({
        path: `${path}.enabled`,
        message: 'Field "enabled" must be a boolean (true/false)',
        code: 'INVALID_ENABLED_TYPE'
      });
    }

    const validStrategies = ['separated', 'colocated', 'hybrid'];
    if (testOrg.strategy && !validStrategies.includes(testOrg.strategy)) {
      errors.push({
        path: `${path}.strategy`,
        message: `Invalid strategy "${testOrg.strategy}". Must be one of: ${validStrategies.join(', ')}`,
        code: 'INVALID_STRATEGY'
      });
    }

    if (testOrg.baseDirectory && typeof testOrg.baseDirectory !== 'string') {
      errors.push({
        path: `${path}.baseDirectory`,
        message: 'Field "baseDirectory" must be a string. Example: "tests" or "test"',
        code: 'INVALID_BASE_DIRECTORY'
      });
    }

    if (testOrg.categories !== undefined) {
      this.validateTestCategories(testOrg.categories, `${path}.categories`, errors, warnings);
    }
  }

  private validateTestCategories(
    categories: any,
    path: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!Array.isArray(categories)) {
      errors.push({
        path,
        message: 'Test categories must be an array',
        code: 'INVALID_CATEGORIES_TYPE'
      });
      return;
    }

    const validCategories = ['unit', 'integration', 'e2e', 'tdd', 'functional', 'performance', 'acceptance', 'contract'];

    categories.forEach((category, index) => {
      const itemPath = `${path}[${index}]`;

      if (!category.name) {
        errors.push({
          path: `${itemPath}.name`,
          message: `Missing "name" field. Valid categories: ${validCategories.join(', ')}`,
          code: 'MISSING_CATEGORY_NAME'
        });
      } else if (!validCategories.includes(category.name)) {
        warnings.push({
          path: `${itemPath}.name`,
          message: `Uncommon category name "${category.name}". Standard categories: ${validCategories.join(', ')}`,
          code: 'UNCOMMON_CATEGORY_NAME'
        });
      }

      if (!category.patterns) {
        errors.push({
          path: `${itemPath}.patterns`,
          message: 'Missing "patterns" array. Example: ["**/*.test.ts", "**/*.spec.ts"]',
          code: 'MISSING_PATTERNS'
        });
      } else if (!Array.isArray(category.patterns)) {
        errors.push({
          path: `${itemPath}.patterns`,
          message: 'Field "patterns" must be an array of glob patterns',
          code: 'INVALID_PATTERNS_TYPE'
        });
      }

      if (!category.targetDirectory) {
        errors.push({
          path: `${itemPath}.targetDirectory`,
          message: 'Missing "targetDirectory" field. Example: "tests/unit"',
          code: 'MISSING_TARGET_DIRECTORY'
        });
      }

      if (!category.description) {
        warnings.push({
          path: `${itemPath}.description`,
          message: 'Recommended: Add a "description" to explain this test category',
          code: 'MISSING_CATEGORY_DESCRIPTION'
        });
      }
    });
  }

  // ========================================================================
  // File Classification Validation
  // ========================================================================

  private validateFileClassification(
    fileClass: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const path = '$.fileClassification';

    if (!fileClass.categories) {
      errors.push({
        path: `${path}.categories`,
        message: 'Missing "categories" object. Expected file category definitions.',
        code: 'MISSING_FILE_CATEGORIES'
      });
      return;
    }

    const validCategories = ['source', 'config', 'documentation', 'script', 'test', 'asset'];

    Object.entries(fileClass.categories).forEach(([name, definition]: [string, any]) => {
      const categoryPath = `${path}.categories.${name}`;

      if (!validCategories.includes(name)) {
        warnings.push({
          path: categoryPath,
          message: `Custom category "${name}". Standard categories: ${validCategories.join(', ')}`,
          code: 'CUSTOM_CATEGORY'
        });
      }

      if (definition.extensions && !Array.isArray(definition.extensions)) {
        errors.push({
          path: `${categoryPath}.extensions`,
          message: 'Field "extensions" must be an array. Example: [".ts", ".js"]',
          code: 'INVALID_EXTENSIONS_TYPE'
        });
      }

      if (definition.patterns && !Array.isArray(definition.patterns)) {
        errors.push({
          path: `${categoryPath}.patterns`,
          message: 'Field "patterns" must be an array of glob patterns',
          code: 'INVALID_PATTERNS_TYPE'
        });
      }
    });
  }

  // ========================================================================
  // Technologies Validation
  // ========================================================================

  private validateTechnologies(
    technologies: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const path = '$.technologies';

    if (typeof technologies !== 'object') {
      errors.push({
        path,
        message: 'Field "technologies" must be an object mapping technology names to their rules',
        code: 'INVALID_TECHNOLOGIES_TYPE'
      });
      return;
    }

    Object.entries(technologies).forEach(([techName, techDef]: [string, any]) => {
      const techPath = `${path}.${techName}`;

      if (!techDef.indicators) {
        errors.push({
          path: `${techPath}.indicators`,
          message: 'Missing "indicators" array. Example: [{ file: "package.json", required: true }]',
          code: 'MISSING_INDICATORS'
        });
      } else if (!Array.isArray(techDef.indicators)) {
        errors.push({
          path: `${techPath}.indicators`,
          message: 'Field "indicators" must be an array',
          code: 'INVALID_INDICATORS_TYPE'
        });
      }
    });
  }

  // ========================================================================
  // Monorepo Validation
  // ========================================================================

  private validateMonorepo(
    monorepo: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const path = '$.monorepo';

    if (monorepo.enabled !== undefined && typeof monorepo.enabled !== 'boolean') {
      errors.push({
        path: `${path}.enabled`,
        message: 'Field "enabled" must be a boolean (true/false)',
        code: 'INVALID_ENABLED_TYPE'
      });
    }

    const validStructures = ['nx', 'lerna', 'turborepo', 'pnpm-workspace', 'yarn-workspace', 'custom'];
    if (monorepo.structure && !validStructures.includes(monorepo.structure)) {
      errors.push({
        path: `${path}.structure`,
        message: `Invalid structure "${monorepo.structure}". Must be one of: ${validStructures.join(', ')}`,
        code: 'INVALID_MONOREPO_STRUCTURE'
      });
    }

    if (monorepo.packageRules && !Array.isArray(monorepo.packageRules)) {
      errors.push({
        path: `${path}.packageRules`,
        message: 'Field "packageRules" must be an array',
        code: 'INVALID_PACKAGE_RULES_TYPE'
      });
    }
  }

  // ========================================================================
  // Naming Conventions Validation
  // ========================================================================

  private validateNamingConventions(
    naming: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const path = '$.namingConventions';

    const validStyles = ['camelCase', 'PascalCase', 'snake_case', 'kebab-case', 'SCREAMING_SNAKE_CASE'];

    if (naming.files && !Array.isArray(naming.files)) {
      errors.push({
        path: `${path}.files`,
        message: 'Field "files" must be an array',
        code: 'INVALID_FILES_TYPE'
      });
    } else if (naming.files) {
      naming.files.forEach((rule: any, index: number) => {
        if (!validStyles.includes(rule.convention)) {
          errors.push({
            path: `${path}.files[${index}].convention`,
            message: `Invalid convention "${rule.convention}". Must be one of: ${validStyles.join(', ')}`,
            code: 'INVALID_CONVENTION'
          });
        }
      });
    }

    if (naming.folders && !Array.isArray(naming.folders)) {
      errors.push({
        path: `${path}.folders`,
        message: 'Field "folders" must be an array',
        code: 'INVALID_FOLDERS_TYPE'
      });
    }
  }

  // ========================================================================
  // Git Validation
  // ========================================================================

  private validateGit(
    git: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const path = '$.git';

    if (git.requiredFiles && !Array.isArray(git.requiredFiles)) {
      errors.push({
        path: `${path}.requiredFiles`,
        message: 'Field "requiredFiles" must be an array. Example: [".gitignore", "README.md"]',
        code: 'INVALID_REQUIRED_FILES_TYPE'
      });
    }

    if (git.suggestedIgnorePatterns && !Array.isArray(git.suggestedIgnorePatterns)) {
      errors.push({
        path: `${path}.suggestedIgnorePatterns`,
        message: 'Field "suggestedIgnorePatterns" must be an array',
        code: 'INVALID_IGNORE_PATTERNS_TYPE'
      });
    }
  }

  // ========================================================================
  // CI/CD Validation
  // ========================================================================

  private validateCICD(
    cicd: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const path = '$.cicd';

    const validChecks = [
      'secretScan',
      'testOrganization',
      'buildValidation',
      'folderStructure',
      'namingConventions',
      'linting',
      'testing'
    ];

    if (cicd.preCommitChecks && !Array.isArray(cicd.preCommitChecks)) {
      errors.push({
        path: `${path}.preCommitChecks`,
        message: 'Field "preCommitChecks" must be an array',
        code: 'INVALID_PRE_COMMIT_CHECKS'
      });
    } else if (cicd.preCommitChecks) {
      cicd.preCommitChecks.forEach((check: string, index: number) => {
        if (!validChecks.includes(check)) {
          warnings.push({
            path: `${path}.preCommitChecks[${index}]`,
            message: `Unknown check "${check}". Valid checks: ${validChecks.join(', ')}`,
            code: 'UNKNOWN_CHECK_TYPE'
          });
        }
      });
    }
  }

  // ========================================================================
  // Custom Rules Validation
  // ========================================================================

  private validateCustomRules(
    customRules: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const path = '$.customRules';

    if (!Array.isArray(customRules)) {
      errors.push({
        path,
        message: 'Field "customRules" must be an array',
        code: 'INVALID_CUSTOM_RULES_TYPE'
      });
      return;
    }

    customRules.forEach((rule: any, index: number) => {
      const rulePath = `${path}[${index}]`;

      if (!rule.id) {
        errors.push({
          path: `${rulePath}.id`,
          message: 'Custom rule must have an "id" field',
          code: 'MISSING_RULE_ID'
        });
      }

      if (!rule.description) {
        warnings.push({
          path: `${rulePath}.description`,
          message: 'Recommended: Add a "description" to explain this custom rule',
          code: 'MISSING_RULE_DESCRIPTION'
        });
      }

      const validSeverities = ['error', 'warning', 'info'];
      if (rule.severity && !validSeverities.includes(rule.severity)) {
        errors.push({
          path: `${rulePath}.severity`,
          message: `Invalid severity "${rule.severity}". Must be one of: ${validSeverities.join(', ')}`,
          code: 'INVALID_SEVERITY'
        });
      }
    });
  }

  // ========================================================================
  // Ignore Validation
  // ========================================================================

  private validateIgnore(
    ignore: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const path = '$.ignore';

    if (!Array.isArray(ignore)) {
      errors.push({
        path,
        message: 'Field "ignore" must be an array of glob patterns. Example: ["node_modules/**", ".git/**"]',
        code: 'INVALID_IGNORE_TYPE'
      });
    }
  }

  // ========================================================================
  // Utility Validation Methods
  // ========================================================================

  private isValidPackageName(name: string): boolean {
    // npm package name rules: lowercase, can have @scope/, hyphens, numbers
    return /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(name);
  }

  private isValidSemver(version: string): boolean {
    // Basic semver validation (major.minor.patch)
    return /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/.test(version);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Format validation result as human-readable output
 */
export function formatValidationResult(result: ValidationResult): string {
  let output = '';

  if (result.valid) {
    output += '✅ Rule pack is valid!\n';
  } else {
    output += `❌ Rule pack validation failed with ${result.errors.length} error(s)\n`;
  }

  if (result.errors.length > 0) {
    output += '\n🔴 Errors:\n';
    result.errors.forEach((error, index) => {
      output += `\n${index + 1}. ${error.path}\n`;
      output += `   ${error.message}\n`;
      output += `   Code: ${error.code}\n`;
    });
  }

  if (result.warnings.length > 0) {
    output += '\n⚠️  Warnings:\n';
    result.warnings.forEach((warning, index) => {
      output += `\n${index + 1}. ${warning.path}\n`;
      output += `   ${warning.message}\n`;
      output += `   Code: ${warning.code}\n`;
    });
  }

  return output;
}
