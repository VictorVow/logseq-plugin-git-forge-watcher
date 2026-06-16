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
]
