import simpleGit from 'simple-git';
import fsExtra from 'fs-extra';
import cac from 'cac';
import { parsePatch } from 'diff';

interface CompareBranchDiffProps {
  baseBranch: string;
  compareBranch: string;
  repoPath: string;
}

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

    for (const patch of patches) {
      if (!patch) continue;

      const filePath = patch.newFileName;
      const outputFile =
        outputDir + filePath!.substring(filePath!.indexOf('/'));
      await fsExtra.ensureDir(
        outputFile.substring(0, outputFile.lastIndexOf('/'))
      );

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
      await fsExtra.writeFile(outputFile, modifiedContent, {
        encoding: 'utf-8'
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

const cli = cac('compare-code').version('1.0.0').help();

cli
  .command('diff [baseBranch] [compareBranch] [repoPath] [outputDir]')
  .action(async (baseBranch, compareBranch, repoPath) => {
    await compareBranchDiff({
      baseBranch,
      compareBranch,
      repoPath
    });
  });

cli.parse();
