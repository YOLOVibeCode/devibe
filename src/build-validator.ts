import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type {
  BuildTechnology,
  BuildValidator,
  BuildResult,
  ICanDetectBuildSystem,
  ICanValidateBuilds,
} from './types.js';

const execAsync = promisify(exec);

export class BuildDetector implements ICanDetectBuildSystem {
  async detect(projectPath: string): Promise<BuildTechnology[]> {
    const technologies: BuildTechnology[] = [];

    // Check for Node.js
    if (await this.fileExists(path.join(projectPath, 'package.json'))) {
      technologies.push('nodejs');
    }

    // Check for Docker
    if (await this.fileExists(path.join(projectPath, 'Dockerfile'))) {
      technologies.push('docker');
    }

    // Check for Python
    if (
      (await this.fileExists(path.join(projectPath, 'setup.py'))) ||
      (await this.fileExists(path.join(projectPath, 'pyproject.toml')))
    ) {
      technologies.push('python');
    }

    // Check for Go
    if (await this.fileExists(path.join(projectPath, 'go.mod'))) {
      technologies.push('go');
    }

    return technologies;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

export class NodeJSBuildValidator implements BuildValidator {
  technology: BuildTechnology = 'nodejs';

  async canValidate(projectPath: string): Promise<boolean> {
    try {
      await fs.access(path.join(projectPath, 'package.json'));
      return true;
    } catch {
      return false;
    }
  }

  async runBuild(projectPath: string): Promise<BuildResult> {
    const startTime = Date.now();

    try {
      // Check if build script exists
      const packageJsonPath = path.join(projectPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

      if (!packageJson.scripts?.build) {
        return {
          success: true,
          exitCode: 0,
          duration: Date.now() - startTime,
          stdout: '',
          stderr: '',
          recommendation: '⚠️  No build script found in package.json\n' +
                        '   Skipping build validation (not blocking)\n' +
                        '   To enable: Add "build": "tsc" or your build command to package.json scripts',
        };
      }

      const { stdout, stderr } = await execAsync('npm run build', {
        cwd: projectPath,
        timeout: 60000, // 60 second timeout
      });

      return {
        success: true,
        exitCode: 0,
        duration: Date.now() - startTime,
        stdout,
        stderr,
      };
    } catch (error: any) {
      // Check if it's a missing script error
      if (error.message?.includes('missing script')) {
        return {
          success: true,
          exitCode: 0,
          duration: Date.now() - startTime,
          stdout: '',
          stderr: '',
          recommendation: '⚠️  Build script not configured\n' +
                        '   This project may not require a build step\n' +
                        '   To add one: Add "build": "your-command" to package.json scripts',
        };
      }

      return {
        success: false,
        exitCode: error.code || 1,
        duration: Date.now() - startTime,
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        recommendation: '💡 Build failed. Possible fixes:\n' +
                      '   • Run "npm install" to ensure dependencies are installed\n' +
                      '   • Check for TypeScript errors if using tsc\n' +
                      '   • Review build script in package.json\n' +
                      '   • Run "npm run build" manually to see full error',
      };
    }
  }
}

export class DockerBuildValidator implements BuildValidator {
  technology: BuildTechnology = 'docker';

  async canValidate(projectPath: string): Promise<boolean> {
    try {
      await fs.access(path.join(projectPath, 'Dockerfile'));
      return true;
    } catch {
      return false;
    }
  }

  async runBuild(projectPath: string): Promise<BuildResult> {
    const startTime = Date.now();

    try {
      // For safety, we only validate Dockerfile syntax, not actually build
      const dockerfilePath = path.join(projectPath, 'Dockerfile');
      const content = await fs.readFile(dockerfilePath, 'utf-8');

      // Basic validation: check for FROM instruction
      if (!content.match(/^FROM\s+/m)) {
        throw new Error('Invalid Dockerfile: missing FROM instruction');
      }

      return {
        success: true,
        exitCode: 0,
        duration: Date.now() - startTime,
        stdout: 'Dockerfile syntax valid',
        stderr: '',
      };
    } catch (error: any) {
      return {
        success: false,
        exitCode: 1,
        duration: Date.now() - startTime,
        stdout: '',
        stderr: error.message,
      };
    }
  }
}

export class PythonBuildValidator implements BuildValidator {
  technology: BuildTechnology = 'python';

  async canValidate(projectPath: string): Promise<boolean> {
    try {
      await fs.access(path.join(projectPath, 'setup.py'));
      return true;
    } catch {
      try {
        await fs.access(path.join(projectPath, 'pyproject.toml'));
        return true;
      } catch {
        return false;
      }
    }
  }

  async runBuild(projectPath: string): Promise<BuildResult> {
    const startTime = Date.now();

    try {
      const { stdout, stderr } = await execAsync('python -m py_compile *.py', {
        cwd: projectPath,
        timeout: 30000,
      });

      return {
        success: true,
        exitCode: 0,
        duration: Date.now() - startTime,
        stdout,
        stderr,
      };
    } catch (error: any) {
      return {
        success: false,
        exitCode: error.code || 1,
        duration: Date.now() - startTime,
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
      };
    }
  }
}

export class GoBuildValidator implements BuildValidator {
  technology: BuildTechnology = 'go';

  async canValidate(projectPath: string): Promise<boolean> {
    try {
      await fs.access(path.join(projectPath, 'go.mod'));
      return true;
    } catch {
      return false;
    }
  }

  async runBuild(projectPath: string): Promise<BuildResult> {
    const startTime = Date.now();

    try {
      const { stdout, stderr } = await execAsync('go build ./...', {
        cwd: projectPath,
        timeout: 60000,
      });

      return {
        success: true,
        exitCode: 0,
        duration: Date.now() - startTime,
        stdout,
        stderr,
      };
    } catch (error: any) {
      return {
        success: false,
        exitCode: error.code || 1,
        duration: Date.now() - startTime,
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
      };
    }
  }
}

export class BuildValidationService implements ICanValidateBuilds {
  private validators: Map<BuildTechnology, BuildValidator>;

  constructor() {
    this.validators = new Map([
      ['nodejs', new NodeJSBuildValidator()],
      ['docker', new DockerBuildValidator()],
      ['python', new PythonBuildValidator()],
      ['go', new GoBuildValidator()],
    ]);
  }

  async validateBuild(
    projectPath: string,
    technology: BuildTechnology
  ): Promise<BuildResult> {
    const validator = this.validators.get(technology);

    if (!validator) {
      throw new Error(`No validator for technology: ${technology}`);
    }

    if (!(await validator.canValidate(projectPath))) {
      throw new Error(
        `Cannot validate ${technology} build at ${projectPath}`
      );
    }

    return validator.runBuild(projectPath);
  }

  async validateAllBuilds(
    projectPath: string
  ): Promise<Map<BuildTechnology, BuildResult>> {
    const detector = new BuildDetector();
    const technologies = await detector.detect(projectPath);
    const results = new Map<BuildTechnology, BuildResult>();

    for (const tech of technologies) {
      try {
        const result = await this.validateBuild(projectPath, tech);
        results.set(tech, result);
      } catch (error: any) {
        results.set(tech, {
          success: false,
          exitCode: 1,
          duration: 0,
          stdout: '',
          stderr: error.message,
        });
      }
    }

    return results;
  }
}
