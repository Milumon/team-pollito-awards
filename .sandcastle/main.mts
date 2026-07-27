import * as sandcastle from '@ai-hero/sandcastle';
import { docker } from '@ai-hero/sandcastle/sandboxes/docker';
import { execFile } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const MODEL = 'openai/gpt-5.4';
const MAX_PARALLEL = 2;

type GitHubIssue = {
  number: number;
  title: string;
  body: string;
  labels: { name: string }[];
};

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
      {
        command:
          'pnpm install --frozen-lockfile --store-dir /home/agent/.pnpm-store',
      },
    ],
  },
};

function extractBlockers(body: string) {
  const marker = '## Blocked by';
  const markerIndex = body.indexOf(marker);
  if (markerIndex === -1) return [];

  const tail = body.slice(markerIndex + marker.length);
  const nextSectionIndex = tail.search(/\n##\s/);
  const section =
    nextSectionIndex === -1 ? tail : tail.slice(0, nextSectionIndex);
  return [...section.matchAll(/#(\d+)/g)].map((match) => match[1]!);
}

const listed = await exec('gh', [
  'issue',
  'list',
  '--state',
  'open',
  '--label',
  'ready-for-agent',
  '--limit',
  '100',
  '--json',
  'number,title,body,labels',
]);

const candidates = (JSON.parse(listed.stdout) as GitHubIssue[])
  .filter((issue) => !issue.labels.some((label) => label.name === 'prd'))
  .sort((a, b) => a.number - b.number);

const blockerIds = [
  ...new Set(candidates.flatMap((issue) => extractBlockers(issue.body))),
];
const blockerStates = new Map<string, string>();

await Promise.all(
  blockerIds.map(async (id) => {
    const viewed = await exec('gh', ['issue', 'view', id, '--json', 'state']);
    blockerStates.set(id, (JSON.parse(viewed.stdout) as { state: string }).state);
  }),
);

const issues = candidates
  .filter((issue) =>
    extractBlockers(issue.body).every(
      (id) => blockerStates.get(id) === 'CLOSED',
    ),
  )
  .slice(0, MAX_PARALLEL)
  .map((issue) => ({
    id: String(issue.number),
    title: issue.title,
    branch: `agent/issue-${issue.number}`,
  }));

if (issues.length === 0) {
  console.log('No hay issues ready-for-agent sin bloqueos.');
  process.exit(0);
}

if (process.env.SANDCASTLE_DRY_RUN === '1') {
  console.log('Dry run. Issues desbloqueados:');
  for (const issue of issues) console.log(`  #${issue.id}: ${issue.title}`);
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
        maxIterations: 1,
        idleTimeoutSeconds: 1_800,
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
        idleTimeoutSeconds: 900,
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
