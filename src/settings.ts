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
      'How long widget data (branches, PRs, issues and repos) is cached before re-querying GitHub. Click a branch icon or a repo star count to force an immediate refresh.',
  },
  {
    key: 'branchPlacement',
    type: 'enum',
    enumChoices: ['start', 'end', 'newLineBefore', 'newLineAfter'],
    enumPicker: 'select',
    default: 'start',
    title: 'Branch widget placement',
    description:
      'Where the slash command puts a branch widget: at the start or end of the existing text, or on its own line before or after it.',
  },
  {
    key: 'issuePlacement',
    type: 'enum',
    enumChoices: ['start', 'end', 'newLineBefore', 'newLineAfter'],
    enumPicker: 'select',
    default: 'start',
    title: 'Issue widget placement',
    description:
      'Where the slash command puts an issue widget: at the start or end of the existing text, or on its own line before or after it.',
  },
  {
    key: 'prPlacement',
    type: 'enum',
    enumChoices: ['start', 'end', 'newLineBefore', 'newLineAfter'],
    enumPicker: 'select',
    default: 'start',
    title: 'Pull request widget placement',
    description:
      'Where the slash command puts a pull request widget: at the start or end of the existing text, or on its own line before or after it.',
  },
  {
    key: 'repoPlacement',
    type: 'enum',
    enumChoices: ['start', 'end', 'newLineBefore', 'newLineAfter'],
    enumPicker: 'select',
    default: 'start',
    title: 'Repo widget placement',
    description:
      'Where a slash command puts a repo widget: at the start or end of the existing text, or on its own line before or after it.',
  },
]
