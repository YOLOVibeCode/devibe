/**
 * Repository Best Practices Analyzer
 * Checks repositories against industry best practices
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface BestPracticeCheck {
  id: string;
  category: BestPracticeCategory;
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  passed: boolean;
  message: string;
  recommendation?: string;
  autoFixable: boolean;
}

export type BestPracticeCategory =
  | 'documentation'
  | 'git'
  | 'security'
  | 'structure'
  | 'dependencies'
  | 'ci-cd'
  | 'licensing'
  | 'quality';

export interface BestPracticesReport {
  totalChecks: number;
  passed: number;
  failed: number;
  score: number; // 0-100
  checks: BestPracticeCheck[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export class RepoBestPracticesAnalyzer {
  async analyze(repoPath: string): Promise<BestPracticesReport> {
    const checks: BestPracticeCheck[] = [];

    // Documentation Checks
    checks.push(...await this.checkDocumentation(repoPath));

    // Git Best Practices
    checks.push(...await this.checkGit(repoPath));

    // Security Best Practices
    checks.push(...await this.checkSecurity(repoPath));

    // Structure Best Practices
    checks.push(...await this.checkStructure(repoPath));

    // Dependencies Best Practices
    checks.push(...await this.checkDependencies(repoPath));

    // CI/CD Best Practices
    checks.push(...await this.checkCICD(repoPath));

    // Licensing Best Practices
    checks.push(...await this.checkLicensing(repoPath));

    // Code Quality Best Practices
    checks.push(...await this.checkQuality(repoPath));

    const passed = checks.filter(c => c.passed).length;
    const failed = checks.filter(c => !c.passed).length;

    const summary = {
      critical: checks.filter(c => !c.passed && c.severity === 'critical').length,
      high: checks.filter(c => !c.passed && c.severity === 'high').length,
      medium: checks.filter(c => !c.passed && c.severity === 'medium').length,
      low: checks.filter(c => !c.passed && c.severity === 'low').length,
    };

    // Calculate weighted score
    const score = this.calculateScore(checks);

    return {
      totalChecks: checks.length,
      passed,
      failed,
      score,
      checks,
      summary
    };
  }

  // ========================================================================
  // Documentation Best Practices
  // ========================================================================

  private async checkDocumentation(repoPath: string): Promise<BestPracticeCheck[]> {
    const checks: BestPracticeCheck[] = [];

    // README.md
    const hasReadme = await this.fileExists(path.join(repoPath, 'README.md'));
    checks.push({
      id: 'doc-readme',
      category: 'documentation',
      name: 'README.md exists',
      description: 'Project should have a README.md file',
      severity: 'critical',
      passed: hasReadme,
      message: hasReadme ? 'README.md found' : 'README.md is missing',
      recommendation: hasReadme ? undefined : 'Create a README.md with project overview, installation, and usage instructions',
      autoFixable: true
    });

    if (hasReadme) {
      const readmeContent = await fs.readFile(path.join(repoPath, 'README.md'), 'utf-8');
      const readmeSize = readmeContent.length;

      // README should be substantial (not just placeholder)
      checks.push({
        id: 'doc-readme-content',
        category: 'documentation',
        name: 'README has substantial content',
        description: 'README should have meaningful documentation (>500 chars)',
        severity: 'high',
        passed: readmeSize > 500,
        message: readmeSize > 500
          ? `README has ${readmeSize} characters`
          : `README is too short (${readmeSize} characters)`,
        recommendation: readmeSize > 500 ? undefined : 'Expand README with: project description, installation steps, usage examples, API docs',
        autoFixable: false
      });

      // Check for essential sections
      const hasInstallation = /##?\s*(install|getting started|setup)/i.test(readmeContent);
      checks.push({
        id: 'doc-readme-installation',
        category: 'documentation',
        name: 'README has installation section',
        description: 'README should include installation/setup instructions',
        severity: 'medium',
        passed: hasInstallation,
        message: hasInstallation ? 'Installation section found' : 'No installation section',
        recommendation: hasInstallation ? undefined : 'Add ## Installation or ## Getting Started section',
        autoFixable: false
      });

      const hasUsage = /##?\s*usage/i.test(readmeContent);
      checks.push({
        id: 'doc-readme-usage',
        category: 'documentation',
        name: 'README has usage section',
        description: 'README should include usage examples',
        severity: 'medium',
        passed: hasUsage,
        message: hasUsage ? 'Usage section found' : 'No usage section',
        recommendation: hasUsage ? undefined : 'Add ## Usage section with code examples',
        autoFixable: false
      });
    }

    // CHANGELOG.md
    const hasChangelog = await this.fileExists(path.join(repoPath, 'CHANGELOG.md'));
    checks.push({
      id: 'doc-changelog',
      category: 'documentation',
      name: 'CHANGELOG.md exists',
      description: 'Project should track changes in CHANGELOG.md',
      severity: 'low',
      passed: hasChangelog,
      message: hasChangelog ? 'CHANGELOG.md found' : 'CHANGELOG.md is missing',
      recommendation: hasChangelog ? undefined : 'Create CHANGELOG.md following Keep a Changelog format',
      autoFixable: true
    });

    // CONTRIBUTING.md
    const hasContributing = await this.fileExists(path.join(repoPath, 'CONTRIBUTING.md'));
    checks.push({
      id: 'doc-contributing',
      category: 'documentation',
      name: 'CONTRIBUTING.md exists',
      description: 'Open source projects should have contribution guidelines',
      severity: 'low',
      passed: hasContributing,
      message: hasContributing ? 'CONTRIBUTING.md found' : 'CONTRIBUTING.md is missing',
      recommendation: hasContributing ? undefined : 'Add CONTRIBUTING.md with PR guidelines, code style, and development setup',
      autoFixable: true
    });

    // API Documentation (for libraries)
    const hasApiDocs = await this.fileExists(path.join(repoPath, 'docs', 'API.md'));
    const packageJson = await this.readPackageJson(repoPath);
    const isLibrary = packageJson?.main || packageJson?.exports;

    if (isLibrary) {
      checks.push({
        id: 'doc-api',
        category: 'documentation',
        name: 'API documentation exists',
        description: 'Libraries should document their public API',
        severity: 'medium',
        passed: hasApiDocs,
        message: hasApiDocs ? 'API docs found' : 'No API documentation',
        recommendation: hasApiDocs ? undefined : 'Create docs/API.md or use JSDoc/TSDoc for auto-generated docs',
        autoFixable: false
      });
    }

    return checks;
  }

  // ========================================================================
  // Git Best Practices
  // ========================================================================

  private async checkGit(repoPath: string): Promise<BestPracticeCheck[]> {
    const checks: BestPracticeCheck[] = [];

    // .gitignore
    const hasGitignore = await this.fileExists(path.join(repoPath, '.gitignore'));
    checks.push({
      id: 'git-gitignore',
      category: 'git',
      name: '.gitignore exists',
      description: 'Repository should have .gitignore file',
      severity: 'critical',
      passed: hasGitignore,
      message: hasGitignore ? '.gitignore found' : '.gitignore is missing',
      recommendation: hasGitignore ? undefined : 'Create .gitignore with node_modules/, dist/, .env, etc.',
      autoFixable: true
    });

    if (hasGitignore) {
      const gitignoreContent = await fs.readFile(path.join(repoPath, '.gitignore'), 'utf-8');

      // Should ignore node_modules
      const ignoresNodeModules = gitignoreContent.includes('node_modules');
      checks.push({
        id: 'git-ignore-node-modules',
        category: 'git',
        name: '.gitignore includes node_modules',
        description: 'Should ignore node_modules directory',
        severity: 'high',
        passed: ignoresNodeModules,
        message: ignoresNodeModules ? 'node_modules ignored' : 'node_modules not ignored',
        recommendation: ignoresNodeModules ? undefined : 'Add "node_modules/" to .gitignore',
        autoFixable: true
      });

      // Should ignore build outputs
      const ignoresBuild = /dist|build|out/i.test(gitignoreContent);
      checks.push({
        id: 'git-ignore-build',
        category: 'git',
        name: '.gitignore includes build outputs',
        description: 'Should ignore compiled/build directories',
        severity: 'high',
        passed: ignoresBuild,
        message: ignoresBuild ? 'Build outputs ignored' : 'Build outputs not ignored',
        recommendation: ignoresBuild ? undefined : 'Add "dist/", "build/", "out/" to .gitignore',
        autoFixable: true
      });

      // Should ignore .env files
      const ignoresEnv = /\.env/.test(gitignoreContent);
      checks.push({
        id: 'git-ignore-env',
        category: 'git',
        name: '.gitignore includes .env files',
        description: 'Should ignore environment files with secrets',
        severity: 'critical',
        passed: ignoresEnv,
        message: ignoresEnv ? 'Environment files ignored' : 'Environment files not ignored',
        recommendation: ignoresEnv ? undefined : 'Add ".env*" to .gitignore to prevent secret leaks',
        autoFixable: true
      });
    }

    // .gitattributes (for line endings)
    const hasGitattributes = await this.fileExists(path.join(repoPath, '.gitattributes'));
    checks.push({
      id: 'git-gitattributes',
      category: 'git',
      name: '.gitattributes exists',
      description: 'Recommended for consistent line endings across platforms',
      severity: 'low',
      passed: hasGitattributes,
      message: hasGitattributes ? '.gitattributes found' : '.gitattributes missing',
      recommendation: hasGitattributes ? undefined : 'Add .gitattributes with "* text=auto eol=lf"',
      autoFixable: true
    });

    return checks;
  }

  // ========================================================================
  // Security Best Practices
  // ========================================================================

  private async checkSecurity(repoPath: string): Promise<BestPracticeCheck[]> {
    const checks: BestPracticeCheck[] = [];

    // .env.example
    const hasEnvExample = await this.fileExists(path.join(repoPath, '.env.example'));
    const hasEnv = await this.fileExists(path.join(repoPath, '.env'));

    if (hasEnv || hasEnvExample) {
      checks.push({
        id: 'security-env-example',
        category: 'security',
        name: '.env.example exists',
        description: 'Should provide .env.example as template',
        severity: 'medium',
        passed: hasEnvExample,
        message: hasEnvExample ? '.env.example found' : '.env.example missing',
        recommendation: hasEnvExample ? undefined : 'Create .env.example with placeholder values (no real secrets)',
        autoFixable: true
      });
    }

    // SECURITY.md
    const hasSecurity = await this.fileExists(path.join(repoPath, 'SECURITY.md'));
    checks.push({
      id: 'security-policy',
      category: 'security',
      name: 'SECURITY.md exists',
      description: 'Public projects should have security policy',
      severity: 'low',
      passed: hasSecurity,
      message: hasSecurity ? 'Security policy found' : 'Security policy missing',
      recommendation: hasSecurity ? undefined : 'Add SECURITY.md with vulnerability reporting instructions',
      autoFixable: true
    });

    // package.json - no scripts with sudo
    const packageJson = await this.readPackageJson(repoPath);
    if (packageJson?.scripts) {
      const hasSudoScript = Object.values(packageJson.scripts).some((script: any) =>
        typeof script === 'string' && /sudo/.test(script)
      );

      checks.push({
        id: 'security-no-sudo',
        category: 'security',
        name: 'No sudo in npm scripts',
        description: 'Scripts should not require sudo/root access',
        severity: 'high',
        passed: !hasSudoScript,
        message: hasSudoScript ? 'Found scripts using sudo' : 'No sudo in scripts',
        recommendation: hasSudoScript ? 'Remove sudo requirements from npm scripts' : undefined,
        autoFixable: false
      });
    }

    // Dependency security (lockfile exists)
    const hasPackageLock = await this.fileExists(path.join(repoPath, 'package-lock.json'));
    const hasYarnLock = await this.fileExists(path.join(repoPath, 'yarn.lock'));
    const hasPnpmLock = await this.fileExists(path.join(repoPath, 'pnpm-lock.yaml'));
    const hasLockfile = hasPackageLock || hasYarnLock || hasPnpmLock;

    if (packageJson) {
      checks.push({
        id: 'security-lockfile',
        category: 'security',
        name: 'Dependency lockfile exists',
        description: 'Lockfile ensures reproducible builds and security',
        severity: 'high',
        passed: hasLockfile,
        message: hasLockfile ? 'Lockfile found' : 'No lockfile (package-lock.json, yarn.lock, or pnpm-lock.yaml)',
        recommendation: hasLockfile ? undefined : 'Commit your package manager\'s lockfile',
        autoFixable: true
      });
    }

    return checks;
  }

  // ========================================================================
  // Structure Best Practices
  // ========================================================================

  private async checkStructure(repoPath: string): Promise<BestPracticeCheck[]> {
    const checks: BestPracticeCheck[] = [];

    // src/ directory
    const hasSrc = await this.directoryExists(path.join(repoPath, 'src'));
    const packageJson = await this.readPackageJson(repoPath);

    if (packageJson) {
      checks.push({
        id: 'structure-src',
        category: 'structure',
        name: 'src/ directory exists',
        description: 'Source code should be in src/ directory',
        severity: 'medium',
        passed: hasSrc,
        message: hasSrc ? 'src/ directory found' : 'No src/ directory',
        recommendation: hasSrc ? undefined : 'Move source code to src/ directory',
        autoFixable: false
      });
    }

    // tests/ directory
    const hasTests = await this.directoryExists(path.join(repoPath, 'tests')) ||
                     await this.directoryExists(path.join(repoPath, 'test')) ||
                     await this.directoryExists(path.join(repoPath, '__tests__'));

    checks.push({
      id: 'structure-tests',
      category: 'structure',
      name: 'Test directory exists',
      description: 'Tests should be organized in tests/ or __tests__/',
      severity: 'high',
      passed: hasTests,
      message: hasTests ? 'Test directory found' : 'No test directory',
      recommendation: hasTests ? undefined : 'Create tests/ directory and organize tests',
      autoFixable: true
    });

    // docs/ directory (for projects with documentation)
    const hasDocs = await this.directoryExists(path.join(repoPath, 'docs'));
    checks.push({
      id: 'structure-docs',
      category: 'structure',
      name: 'docs/ directory exists',
      description: 'Additional documentation should be in docs/',
      severity: 'low',
      passed: hasDocs,
      message: hasDocs ? 'docs/ directory found' : 'No docs/ directory',
      recommendation: hasDocs ? undefined : 'Create docs/ for additional documentation',
      autoFixable: true
    });

    // No source files in root
    const entries = await fs.readdir(repoPath, { withFileTypes: true });
    const rootSourceFiles = entries.filter(e =>
      e.isFile() && /\.(ts|js|tsx|jsx)$/.test(e.name) && !e.name.includes('.config') && !e.name.includes('.test')
    );

    checks.push({
      id: 'structure-no-root-source',
      category: 'structure',
      name: 'No source files in root',
      description: 'Source files should be in src/, not root directory',
      severity: 'medium',
      passed: rootSourceFiles.length === 0,
      message: rootSourceFiles.length === 0
        ? 'No source files in root'
        : `Found ${rootSourceFiles.length} source files in root: ${rootSourceFiles.map(f => f.name).join(', ')}`,
      recommendation: rootSourceFiles.length === 0 ? undefined : 'Move source files to src/ directory',
      autoFixable: false
    });

    return checks;
  }

  // ========================================================================
  // Dependencies Best Practices
  // ========================================================================

  private async checkDependencies(repoPath: string): Promise<BestPracticeCheck[]> {
    const checks: BestPracticeCheck[] = [];
    const packageJson = await this.readPackageJson(repoPath);

    if (!packageJson) {
      return checks;
    }

    // Engines field (Node.js version)
    const hasEngines = !!packageJson.engines;
    checks.push({
      id: 'deps-engines',
      category: 'dependencies',
      name: 'Specifies Node.js version',
      description: 'package.json should specify required Node.js version',
      severity: 'medium',
      passed: hasEngines,
      message: hasEngines
        ? `Node version specified: ${packageJson.engines?.node}`
        : 'No Node.js version specified',
      recommendation: hasEngines ? undefined : 'Add "engines": { "node": ">=18.0.0" } to package.json',
      autoFixable: true
    });

    // No wildcards in dependencies
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    const hasWildcards = Object.values(allDeps || {}).some((version: any) =>
      version === '*' || version === 'latest'
    );

    checks.push({
      id: 'deps-no-wildcards',
      category: 'dependencies',
      name: 'No wildcard versions',
      description: 'Dependencies should have specific version ranges',
      severity: 'high',
      passed: !hasWildcards,
      message: hasWildcards ? 'Found wildcard versions (*  or latest)' : 'All dependencies have specific versions',
      recommendation: hasWildcards ? 'Replace "*" and "latest" with specific semver ranges (e.g., "^1.0.0")' : undefined,
      autoFixable: false
    });

    // Separate dev dependencies
    const hasDevDeps = !!packageJson.devDependencies && Object.keys(packageJson.devDependencies).length > 0;
    const hasDeps = !!packageJson.dependencies && Object.keys(packageJson.dependencies).length > 0;

    if (hasDeps) {
      checks.push({
        id: 'deps-dev-separated',
        category: 'dependencies',
        name: 'Development dependencies separated',
        description: 'Dev dependencies should be in devDependencies',
        severity: 'low',
        passed: hasDevDeps,
        message: hasDevDeps ? 'devDependencies used' : 'No devDependencies section',
        recommendation: hasDevDeps ? undefined : 'Move build tools and test frameworks to devDependencies',
        autoFixable: false
      });
    }

    return checks;
  }

  // ========================================================================
  // CI/CD Best Practices
  // ========================================================================

  private async checkCICD(repoPath: string): Promise<BestPracticeCheck[]> {
    const checks: BestPracticeCheck[] = [];

    // GitHub Actions
    const hasGitHubActions = await this.directoryExists(path.join(repoPath, '.github', 'workflows'));

    // GitLab CI
    const hasGitLabCI = await this.fileExists(path.join(repoPath, '.gitlab-ci.yml'));

    // Circle CI
    const hasCircleCI = await this.fileExists(path.join(repoPath, '.circleci', 'config.yml'));

    // Travis CI
    const hasTravisCI = await this.fileExists(path.join(repoPath, '.travis.yml'));

    const hasCI = hasGitHubActions || hasGitLabCI || hasCircleCI || hasTravisCI;

    checks.push({
      id: 'cicd-exists',
      category: 'ci-cd',
      name: 'CI/CD configured',
      description: 'Project should have automated testing/deployment',
      severity: 'medium',
      passed: hasCI,
      message: hasCI ? 'CI/CD configuration found' : 'No CI/CD configuration',
      recommendation: hasCI ? undefined : 'Add GitHub Actions, GitLab CI, or other CI/CD platform',
      autoFixable: true
    });

    // Pre-commit hooks
    const hasHusky = await this.fileExists(path.join(repoPath, '.husky'));
    const packageJson = await this.readPackageJson(repoPath);
    const hasPreCommitScript = packageJson?.scripts?.['pre-commit'];

    const hasPreCommitHooks = hasHusky || hasPreCommitScript;

    checks.push({
      id: 'cicd-pre-commit',
      category: 'ci-cd',
      name: 'Pre-commit hooks configured',
      description: 'Should validate code before commits',
      severity: 'low',
      passed: hasPreCommitHooks,
      message: hasPreCommitHooks ? 'Pre-commit hooks found' : 'No pre-commit hooks',
      recommendation: hasPreCommitHooks ? undefined : 'Add Husky or similar for pre-commit linting/testing',
      autoFixable: true
    });

    return checks;
  }

  // ========================================================================
  // Licensing Best Practices
  // ========================================================================

  private async checkLicensing(repoPath: string): Promise<BestPracticeCheck[]> {
    const checks: BestPracticeCheck[] = [];

    // LICENSE file
    const hasLicense = await this.fileExists(path.join(repoPath, 'LICENSE')) ||
                       await this.fileExists(path.join(repoPath, 'LICENSE.md')) ||
                       await this.fileExists(path.join(repoPath, 'LICENSE.txt'));

    checks.push({
      id: 'license-file',
      category: 'licensing',
      name: 'LICENSE file exists',
      description: 'Open source projects must have a license',
      severity: 'high',
      passed: hasLicense,
      message: hasLicense ? 'LICENSE file found' : 'LICENSE file missing',
      recommendation: hasLicense ? undefined : 'Add LICENSE file (MIT, Apache-2.0, GPL-3.0, etc.)',
      autoFixable: true
    });

    // package.json license field
    const packageJson = await this.readPackageJson(repoPath);
    const hasLicenseField = !!packageJson?.license;

    if (packageJson) {
      checks.push({
        id: 'license-package-json',
        category: 'licensing',
        name: 'License in package.json',
        description: 'package.json should specify license',
        severity: 'medium',
        passed: hasLicenseField,
        message: hasLicenseField ? `License: ${packageJson.license}` : 'No license field in package.json',
        recommendation: hasLicenseField ? undefined : 'Add "license": "MIT" (or your chosen license) to package.json',
        autoFixable: true
      });
    }

    return checks;
  }

  // ========================================================================
  // Code Quality Best Practices
  // ========================================================================

  private async checkQuality(repoPath: string): Promise<BestPracticeCheck[]> {
    const checks: BestPracticeCheck[] = [];
    const packageJson = await this.readPackageJson(repoPath);

    if (!packageJson) {
      return checks;
    }

    // Linting configuration
    const hasEslint = await this.fileExists(path.join(repoPath, '.eslintrc.js')) ||
                      await this.fileExists(path.join(repoPath, '.eslintrc.json')) ||
                      await this.fileExists(path.join(repoPath, 'eslint.config.js')) ||
                      !!packageJson.eslintConfig;

    checks.push({
      id: 'quality-eslint',
      category: 'quality',
      name: 'ESLint configured',
      description: 'JavaScript/TypeScript projects should use ESLint',
      severity: 'medium',
      passed: hasEslint,
      message: hasEslint ? 'ESLint configuration found' : 'No ESLint configuration',
      recommendation: hasEslint ? undefined : 'Add .eslintrc.js or eslint.config.js',
      autoFixable: true
    });

    // Formatting
    const hasPrettier = await this.fileExists(path.join(repoPath, '.prettierrc')) ||
                        await this.fileExists(path.join(repoPath, '.prettierrc.json')) ||
                        await this.fileExists(path.join(repoPath, 'prettier.config.js')) ||
                        !!packageJson.prettier;

    checks.push({
      id: 'quality-prettier',
      category: 'quality',
      name: 'Prettier configured',
      description: 'Projects should use automatic code formatting',
      severity: 'low',
      passed: hasPrettier,
      message: hasPrettier ? 'Prettier configuration found' : 'No Prettier configuration',
      recommendation: hasPrettier ? undefined : 'Add .prettierrc for consistent code formatting',
      autoFixable: true
    });

    // TypeScript
    const hasTypeScript = await this.fileExists(path.join(repoPath, 'tsconfig.json'));

    if (hasTypeScript) {
      checks.push({
        id: 'quality-typescript',
        category: 'quality',
        name: 'TypeScript configured',
        description: 'TypeScript projects should have tsconfig.json',
        severity: 'medium',
        passed: hasTypeScript,
        message: 'TypeScript configuration found',
        recommendation: undefined,
        autoFixable: false
      });
    }

    // Test scripts
    const hasTestScript = !!packageJson.scripts?.test;

    checks.push({
      id: 'quality-test-script',
      category: 'quality',
      name: 'Test script defined',
      description: 'package.json should have "test" script',
      severity: 'high',
      passed: hasTestScript,
      message: hasTestScript ? 'Test script found' : 'No test script in package.json',
      recommendation: hasTestScript ? undefined : 'Add "test" script to package.json (e.g., "vitest run")',
      autoFixable: true
    });

    // Build script (for libraries/apps)
    const hasBuildScript = !!packageJson.scripts?.build;
    const isApp = packageJson.main || packageJson.bin || packageJson.exports;

    if (isApp) {
      checks.push({
        id: 'quality-build-script',
        category: 'quality',
        name: 'Build script defined',
        description: 'Libraries/apps should have "build" script',
        severity: 'medium',
        passed: hasBuildScript,
        message: hasBuildScript ? 'Build script found' : 'No build script in package.json',
        recommendation: hasBuildScript ? undefined : 'Add "build" script to package.json (e.g., "tsc")',
        autoFixable: true
      });
    }

    // EditorConfig
    const hasEditorConfig = await this.fileExists(path.join(repoPath, '.editorconfig'));
    checks.push({
      id: 'quality-editorconfig',
      category: 'quality',
      name: 'EditorConfig configured',
      description: 'Recommended for consistent editor settings',
      severity: 'low',
      passed: hasEditorConfig,
      message: hasEditorConfig ? 'EditorConfig found' : 'No .editorconfig',
      recommendation: hasEditorConfig ? undefined : 'Add .editorconfig for consistent indentation, line endings, etc.',
      autoFixable: true
    });

    return checks;
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(filePath);
      return stat.isFile();
    } catch {
      return false;
    }
  }

  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  private async readPackageJson(repoPath: string): Promise<any | null> {
    try {
      const content = await fs.readFile(path.join(repoPath, 'package.json'), 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private calculateScore(checks: BestPracticeCheck[]): number {
    // Weighted scoring system
    const weights = {
      critical: 10,
      high: 5,
      medium: 2,
      low: 1
    };

    let totalWeight = 0;
    let achievedWeight = 0;

    for (const check of checks) {
      const weight = weights[check.severity];
      totalWeight += weight;
      if (check.passed) {
        achievedWeight += weight;
      }
    }

    return totalWeight === 0 ? 100 : Math.round((achievedWeight / totalWeight) * 100);
  }
}

/**
 * Format best practices report for CLI output
 */
export function formatBestPracticesReport(report: BestPracticesReport): string {
  let output = '';

  output += '📊 Repository Best Practices Report\n\n';
  output += `Score: ${report.score}/100 ${getScoreEmoji(report.score)}\n`;
  output += `Passed: ${report.passed}/${report.totalChecks}\n`;
  output += `Failed: ${report.failed}/${report.totalChecks}\n\n`;

  if (report.summary.critical > 0) {
    output += `🔴 Critical Issues: ${report.summary.critical}\n`;
  }
  if (report.summary.high > 0) {
    output += `🟠 High Priority: ${report.summary.high}\n`;
  }
  if (report.summary.medium > 0) {
    output += `🟡 Medium Priority: ${report.summary.medium}\n`;
  }
  if (report.summary.low > 0) {
    output += `🔵 Low Priority: ${report.summary.low}\n`;
  }

  output += '\n';

  // Group by category
  const byCategory = new Map<string, BestPracticeCheck[]>();
  for (const check of report.checks) {
    if (!byCategory.has(check.category)) {
      byCategory.set(check.category, []);
    }
    byCategory.get(check.category)!.push(check);
  }

  for (const [category, checks] of byCategory) {
    const passed = checks.filter(c => c.passed).length;
    const total = checks.length;

    output += `\n${getCategoryEmoji(category)} ${category.toUpperCase()} (${passed}/${total})\n`;
    output += '─'.repeat(50) + '\n';

    for (const check of checks.filter(c => !c.passed)) {
      output += `\n${getSeverityIcon(check.severity)} ${check.name}\n`;
      output += `   ${check.message}\n`;
      if (check.recommendation) {
        output += `   💡 ${check.recommendation}\n`;
      }
      if (check.autoFixable) {
        output += `   ✨ Auto-fixable\n`;
      }
    }
  }

  return output;
}

function getScoreEmoji(score: number): string {
  if (score >= 90) return '🏆';
  if (score >= 75) return '✅';
  if (score >= 60) return '⚠️';
  return '❌';
}

function getSeverityIcon(severity: string): string {
  switch (severity) {
    case 'critical': return '🔴';
    case 'high': return '🟠';
    case 'medium': return '🟡';
    case 'low': return '🔵';
    default: return '⚪';
  }
}

function getCategoryEmoji(category: string): string {
  switch (category) {
    case 'documentation': return '📚';
    case 'git': return '🔧';
    case 'security': return '🔒';
    case 'structure': return '📁';
    case 'dependencies': return '📦';
    case 'ci-cd': return '🚀';
    case 'licensing': return '⚖️';
    case 'quality': return '✨';
    default: return '📋';
  }
}
