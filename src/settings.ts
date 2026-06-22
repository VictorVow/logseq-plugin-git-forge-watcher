import { SettingSchemaDesc } from '@logseq/libs/dist/LSPlugin.user'

export const settings: SettingSchemaDesc[] = [
  {
    key: 'githubToken',
    type: 'string',
    default: '',
    title: 'GitHub token',
    description:
      'Optional personal access token. Increases the API rate limit and lets the plugin read branches/PRs in private repos.',
  },
  {
    key: 'staleDays',
    type: 'number',
    default: 30,
    title: 'Stale threshold (days)',
    description:
      'A branch whose last commit is older than this many days is shown in yellow (stale) instead of green (active).',
  },
  {
    key: 'preferLastUrl',
    type: 'boolean',
    default: false,
    title: 'Prefer last URL',
    description:
      'When a block contains more than one matching GitHub link, slash commands use the first one by default. Toggle this on to use the last one instead.',
  },
  {
    key: 'cacheTtlHours',
    type: 'number',
    default: 24,
    title: 'Cache TTL (hours)',
    description:
      'How long branch/PR status is cached before re-querying GitHub. Click a branch icon to force an immediate refresh.',
  },
  {
    key: 'branchInsertAtStart',
    type: 'boolean',
    default: true,
    title: 'Branch widget at start of block',
    description:
      'Insert the branch renderer at the start of the block (before the text). Toggle off to append it at the end instead.',
  },
  {
    key: 'issueInsertAtStart',
    type: 'boolean',
    default: true,
    title: 'Issue widget at start of block',
    description:
      'Insert the issue renderer at the start of the block (before the text). Toggle off to append it at the end instead.',
  },
  {
    key: 'prInsertAtStart',
    type: 'boolean',
    default: true,
    title: 'Pull request widget at start of block',
    description:
      'Insert the pull request renderer at the start of the block (before the text). Toggle off to append it at the end instead.',
  },
  {
    key: 'repoInsertAtStart',
    type: 'boolean',
    default: true,
    title: 'Repo widget at start of block',
    description:
      'Insert the repo renderer at the start of the block (before the text). Toggle off to append it at the end instead.',
  },
]
