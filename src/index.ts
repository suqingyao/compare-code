import simpleGit from 'simple-git';
import fsExtra from 'fs-extra';
import cac from 'cac';
import { parsePatch } from 'diff';
import path from 'pathe';
import chalk from 'chalk';
import ora from 'ora';

interface CompareBranchDiffProps {
  baseBranch: string;
  compareBranch: string;
  repoPath: string;
}

const spinner = ora({
  text: `⌛ ${chalk.yellow('Generating...')}`,
  color: 'blue'
});

export async function compareBranchDiff({
  baseBranch,
  compareBranch,
  repoPath
}: CompareBranchDiffProps) {
  const gitRepo = simpleGit(repoPath);

  const outputDir = repoPath.match(/[^/]+(?=\/?$)/)![0];

  try {
    const diff = await gitRepo.diff([baseBranch, compareBranch]);
    const patches = parsePatch(diff);

    if (fsExtra.pathExistsSync(outputDir)) {
      fsExtra.removeSync(outputDir);
    }
    spinner.start();

    for (const patch of patches) {
      if (!patch) continue;

      const filePath = patch.newFileName;

      if (!filePath) {
        continue;
      }

      const outputFile = outputDir + filePath?.replace(/^[^/]+\//, '/');
      await fsExtra.ensureDir(outputFile.substring(0, outputFile.lastIndexOf('/')));

      const hunks = patch.hunks;
      const modifiedLines: string[] = [];

      hunks.forEach((hunk) => {
        hunk.lines.forEach((line) => {
          // Include only added lines
          if (line.startsWith('+') && !line.startsWith('++')) {
            modifiedLines.push(line.substring(1));
          }
        });
      });

      const modifiedContent = modifiedLines.join('\n');

      await fsExtra.writeFile(path.join(process.cwd(), outputFile), modifiedContent, {
        encoding: 'utf-8'
      });
    }
    spinner.stopAndPersist({
      symbol: `✅`,
      text: `${chalk.green(`Successfully`)} ${chalk.white(
        `Please open ${path.join(process.cwd(), outputDir)} confirm!`
      )}`
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

const cli = cac('compare-code').version('1.0.0').help();

cli
  .command('[baseBranch] [compareBranch] [repoPath]')
  .action(async (baseBranch, compareBranch, repoPath) => {
    await compareBranchDiff({
      baseBranch,
      compareBranch,
      repoPath
    });
  });

cli.parse();
