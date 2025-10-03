import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  GitRepository,
  GitDetectionResult,
  ICanDetectGitRepositories,
  ICanValidateGitBoundaries,
} from './types.js';

export class GitDetector
  implements ICanDetectGitRepositories, ICanValidateGitBoundaries
{
  async detectRepositories(rootPath: string): Promise<GitDetectionResult> {
    const repositories: GitRepository[] = [];

    await this.scanDirectory(rootPath, rootPath, repositories);

    const rootRepo = repositories.find((r) => r.path === rootPath);

    return {
      repositories,
      rootRepo,
      hasMultipleRepos: repositories.length > 1,
    };
  }

  private async scanDirectory(
    currentPath: string,
    rootPath: string,
    repositories: GitRepository[]
  ): Promise<void> {
    try {
      const gitPath = path.join(currentPath, '.git');
      const hasGit = await this.pathExists(gitPath);

      if (hasGit) {
        repositories.push({
          path: currentPath,
          rootPath,
          isRoot: currentPath === rootPath,
        });
      }

      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && entry.name !== '.git' && entry.name !== 'node_modules') {
          await this.scanDirectory(
            path.join(currentPath, entry.name),
            rootPath,
            repositories
          );
        }
      }
    } catch (error) {
      // Ignore permission errors or invalid paths
    }
  }

  private async pathExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  isWithinRepository(filePath: string, repoPath: string): boolean {
    const normalizedFile = path.resolve(filePath);
    const normalizedRepo = path.resolve(repoPath);

    return normalizedFile.startsWith(normalizedRepo + path.sep) ||
           normalizedFile === normalizedRepo ||
           normalizedFile.startsWith(normalizedRepo + '/');
  }

  canMoveFile(
    sourcePath: string,
    targetPath: string,
    repositories: GitRepository[]
  ): boolean {
    const sourceRepo = this.findRepositoryForPath(sourcePath, repositories);
    const targetRepo = this.findRepositoryForPath(targetPath, repositories);

    if (!sourceRepo || !targetRepo) {
      return false;
    }

    // Allow moves within same repository
    if (sourceRepo.path === targetRepo.path) {
      return true;
    }

    // Allow moves from root to sub-repository (root file distribution)
    if (sourceRepo.isRoot && !targetRepo.isRoot) {
      return true;
    }

    // Prevent all other cross-repository moves
    return false;
  }

  private findRepositoryForPath(
    filePath: string,
    repositories: GitRepository[]
  ): GitRepository | undefined {
    const normalizedPath = path.resolve(filePath);

    // Find the most specific (deepest) repository containing this path
    let bestMatch: GitRepository | undefined;
    let bestMatchDepth = -1;

    for (const repo of repositories) {
      if (this.isWithinRepository(normalizedPath, repo.path)) {
        const depth = repo.path.split(path.sep).length;
        if (depth > bestMatchDepth) {
          bestMatch = repo;
          bestMatchDepth = depth;
        }
      }
    }

    return bestMatch;
  }
}
