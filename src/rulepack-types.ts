/**
 * DeVibe Rule Pack Type Definitions
 * Specification: RULE_PACK_SPEC.md v1.0
 */

// ============================================================================
// Core Rule Pack Schema
// ============================================================================

export interface RulePack {
  schema: 'devibe-rulepack/v1';
  metadata: RulePackMetadata;
  extends?: string[];
  structure?: StructureRules;
  testOrganization?: TestOrganizationRules;
  fileClassification?: FileClassificationRules;
  technologies?: TechnologyRules;
  monorepo?: MonorepoRules;
  secretScanning?: SecretScanningRules;
  namingConventions?: NamingConventionRules;
  git?: GitRules;
  cicd?: CICDRules;
  customRules?: CustomRule[];
  ignore?: string[];
}

// ============================================================================
// Metadata
// ============================================================================

export interface RulePackMetadata {
  name: string;
  version: string;
  author: string;
  description: string;
  tags?: string[];
  license?: string;
  homepage?: string;
  repository?: string;
  compatibility?: {
    devibe: string;
    technologies?: string[];
  };
}

// ============================================================================
// Directory Structure Rules
// ============================================================================

export interface StructureRules {
  enforced: boolean;
  requiredFolders?: FolderRule[];
  optionalFolders?: FolderRule[];
  forbiddenAtRoot?: ForbiddenPattern[];
}

export interface FolderRule {
  path: string;
  description: string;
  allowedCategories?: FileCategory[];
  requiredFiles?: string[];
}

export interface ForbiddenPattern {
  pattern?: string;
  message: string;
}

export type FileCategory = 'source' | 'config' | 'documentation' | 'script' | 'test' | 'asset' | 'unknown';

// ============================================================================
// Test Organization Rules
// ============================================================================

export interface TestOrganizationRules {
  enabled: boolean;
  strategy: TestStrategy;
  baseDirectory: string;
  categories?: TestCategoryRule[];
  technologyOverrides?: Record<string, TechnologyTestOverride>;
}

export type TestStrategy = 'separated' | 'colocated' | 'hybrid';

export interface TestCategoryRule {
  name: string;
  patterns: string[];
  targetDirectory: string;
  description: string;
}

export interface TechnologyTestOverride {
  strategy?: TestStrategy;
  baseDirectory?: string;
  patterns?: string[];
}

// ============================================================================
// File Classification Rules
// ============================================================================

export interface FileClassificationRules {
  categories: Record<string, FileCategoryDefinition>;
}

export interface FileCategoryDefinition {
  extensions?: string[];
  patterns?: string[];
  excludePatterns?: string[];
  suggestedLocation?: string;
}

// ============================================================================
// Technology Rules
// ============================================================================

export interface TechnologyRules {
  [technology: string]: TechnologyRule;
}

export interface TechnologyRule {
  indicators: TechnologyIndicator[];
  structure?: TechnologyStructure;
}

export interface TechnologyIndicator {
  file?: string;
  type?: 'file' | 'directory';
  required?: boolean;
  packageDependency?: string;
}

export interface TechnologyStructure {
  requiredFolders?: string[];
  preferredPackageManager?: 'npm' | 'yarn' | 'pnpm';
  componentPattern?: string;
  [key: string]: any;
}

// ============================================================================
// Monorepo Rules
// ============================================================================

export interface MonorepoRules {
  enabled: boolean;
  structure: MonorepoStructure;
  packageRules?: PackageRule[];
}

export type MonorepoStructure = 'nx' | 'lerna' | 'turborepo' | 'pnpm-workspace' | 'yarn-workspace' | 'custom';

export interface PackageRule {
  pattern: string;
  type: PackageType;
  requiredFolders?: string[];
  requiredFiles?: string[];
}

export type PackageType = 'application' | 'library' | 'tool' | 'config';

// ============================================================================
// Secret Scanning Rules
// ============================================================================

export interface SecretScanningRules {
  severity: 'critical' | 'high' | 'medium' | 'low';
  patterns?: SecretPatternRule[];
}

export interface SecretPatternRule {
  id: string;
  name: string;
  pattern: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
}

// ============================================================================
// Naming Convention Rules
// ============================================================================

export interface NamingConventionRules {
  files?: NamingConvention[];
  folders?: NamingConvention[];
}

export interface NamingConvention {
  pattern: string;
  convention: NamingStyle;
  example: string;
  message?: string;
}

export type NamingStyle = 'camelCase' | 'PascalCase' | 'snake_case' | 'kebab-case' | 'SCREAMING_SNAKE_CASE';

// ============================================================================
// Git Rules
// ============================================================================

export interface GitRules {
  requiredFiles?: string[];
  suggestedIgnorePatterns?: string[];
}

// ============================================================================
// CI/CD Rules
// ============================================================================

export interface CICDRules {
  preCommitChecks?: CheckType[];
  prChecks?: CheckType[];
}

export type CheckType =
  | 'secretScan'
  | 'testOrganization'
  | 'buildValidation'
  | 'folderStructure'
  | 'namingConventions'
  | 'linting'
  | 'testing';

// ============================================================================
// Custom Rules
// ============================================================================

export interface CustomRule {
  id: string;
  description: string;
  filePatterns: string[];
  validator: string;
  severity: 'error' | 'warning' | 'info';
}

// ============================================================================
// Rule Pack Manager
// ============================================================================

export interface RulePackConfig {
  rulepacks: string[];
  overrides?: Partial<RulePack>;
  disabledRules?: string[];
}

export interface RulePackSource {
  type: 'local' | 'npm' | 'github' | 'url';
  source: string;
  version?: string;
}

export interface ResolvedRulePack extends RulePack {
  _resolved: {
    source: RulePackSource;
    loadedAt: Date;
    dependencies: string[];
  };
}

// ============================================================================
// Rule Pack Operations
// ============================================================================

export interface ICanManageRulePacks {
  install(source: string, version?: string): Promise<RulePack>;
  remove(name: string): Promise<void>;
  list(): Promise<RulePackMetadata[]>;
  resolve(name: string): Promise<ResolvedRulePack>;
  validate(rulePack: RulePack): Promise<ValidationResult>;
  search(query: string): Promise<RulePackMetadata[]>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  path: string;
  message: string;
  code: string;
}

// ============================================================================
// Rule Pack Registry
// ============================================================================

export interface RulePackRegistry {
  name: string;
  url: string;
  priority: number;
}

export interface RulePackSearchResult {
  name: string;
  version: string;
  description: string;
  author: string;
  downloads?: number;
  stars?: number;
  tags: string[];
  publishedAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Composition & Merging
// ============================================================================

export interface ICanComposeRulePacks {
  compose(rulepacks: RulePack[]): Promise<RulePack>;
  merge(base: RulePack, override: Partial<RulePack>): RulePack;
}

// ============================================================================
// Built-in Rule Packs
// ============================================================================

export const OFFICIAL_RULEPACKS = {
  BASE: '@devibe/base',
  NODEJS_STANDARD: '@devibe/nodejs-standard',
  NODEJS_MONOREPO: '@devibe/nodejs-monorepo',
  REACT_STANDARD: '@devibe/react-standard',
  PYTHON_STANDARD: '@devibe/python-standard',
  GO_STANDARD: '@devibe/go-standard',
  JAVA_MAVEN: '@devibe/java-maven',
  JAVA_GRADLE: '@devibe/java-gradle',
  CONVENTIONAL_TESTS: '@devibe/conventional-tests',
} as const;

export type OfficialRulePack = typeof OFFICIAL_RULEPACKS[keyof typeof OFFICIAL_RULEPACKS];
