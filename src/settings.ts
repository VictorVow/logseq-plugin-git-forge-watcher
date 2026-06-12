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
]
