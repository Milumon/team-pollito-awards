import * as sandcastle from '@ai-hero/sandcastle';
import { docker } from '@ai-hero/sandcastle/sandboxes/docker';
import { execFile } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { z } from 'zod';

const exec = promisify(execFile);
const MODEL = 'openai/gpt-5.6-sol';
const MAX_PARALLEL = 2;

const planSchema = z.object({
  issues: z.array(
    z.object({ id: z.string(), title: z.string(), branch: z.string() }),
  ),
});

const ghToken = (await exec('gh', ['auth', 'token'])).stdout.trim();

const sandboxProvider = () =>
  docker({
    imageName: 'sandcastle:team-pollito-awards',
    mounts: [
      {
        hostPath: join(homedir(), '.local', 'share', 'opencode', 'auth.json'),
        sandboxPath: '/home/agent/.local/share/opencode/auth.json',
        readonly: true,
      },
    ],
  });

const agent = () =>
  sandcastle.opencode(MODEL, {
    agent: 'build',
    env: { GH_TOKEN: ghToken },
  });

const hooks = {
  sandbox: {
    onSandboxReady: [
      { command: 'pnpm install --frozen-lockfile' },
    ],
  },
};

const plan = await sandcastle.run({
  agent: agent(),
  hooks,
  sandbox: sandboxProvider(),
  name: 'planner',
  maxIterations: 1,
  promptFile: './.sandcastle/plan-prompt.md',
  output: sandcastle.Output.object({ tag: 'plan', schema: planSchema }),
});

const issues = plan.output.issues.slice(0, MAX_PARALLEL);

if (issues.length === 0) {
  console.log('No hay issues ready-for-agent sin bloqueos.');
  process.exit(0);
}

console.log(`Ejecutando ${issues.length} issue(s) en paralelo:`);
for (const issue of issues) {
  console.log(`  #${issue.id}: ${issue.title} -> ${issue.branch}`);
}

const settled = await Promise.allSettled(
  issues.map(async (issue) => {
    const sandbox = await sandcastle.createSandbox({
      branch: issue.branch,
      sandbox: sandboxProvider(),
      hooks,
    });

    try {
      const implementation = await sandbox.run({
        agent: agent(),
        name: `implement-${issue.id}`,
        maxIterations: 3,
        promptFile: './.sandcastle/implement-prompt.md',
        promptArgs: {
          TASK_ID: issue.id,
          ISSUE_TITLE: issue.title,
          BRANCH: issue.branch,
        },
      });

      if (implementation.commits.length === 0) {
        throw new Error(`El implementador de #${issue.id} no creó commits.`);
      }

      const review = await sandbox.run({
        agent: agent(),
        name: `review-${issue.id}`,
        maxIterations: 1,
        promptFile: './.sandcastle/review-prompt.md',
        promptArgs: {
          TASK_ID: issue.id,
          ISSUE_TITLE: issue.title,
          BRANCH: issue.branch,
        },
      });

      return {
        issue,
        commits: [...implementation.commits, ...review.commits],
      };
    } finally {
      await sandbox.close();
    }
  }),
);

for (const outcome of settled) {
  if (outcome.status === 'rejected') {
    console.error('Pipeline fallido:', outcome.reason);
    continue;
  }

  const { issue } = outcome.value;
  await exec('git', ['push', '--set-upstream', 'origin', issue.branch]);

  const existing = await exec('gh', [
    'pr',
    'list',
    '--head',
    issue.branch,
    '--json',
    'url',
    '--jq',
    '.[0].url',
  ]);

  let prUrl = existing.stdout.trim();
  if (!prUrl) {
    const created = await exec('gh', [
      'pr',
      'create',
      '--base',
      'master',
      '--head',
      issue.branch,
      '--title',
      issue.title,
      '--body',
      `Closes #${issue.id}\n\nImplementado y revisado por agentes aislados de Sandcastle. Requiere CI y revisión humana antes de fusionar.`,
    ]);
    prUrl = created.stdout.trim();
  }

  await exec('gh', [
    'issue',
    'edit',
    issue.id,
    '--remove-label',
    'ready-for-agent',
    '--add-label',
    'ready-for-human',
  ]);

  console.log(`#${issue.id} listo para revisión humana: ${prUrl}`);
}

console.log('Ola terminada. No se fusionó ni cerró ningún issue automáticamente.');
