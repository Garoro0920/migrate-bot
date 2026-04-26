// GitHub webhook payload の最小型定義。Octokit の type は重いので
// 必要なフィールドだけ手書きする。

export interface InstallationPayload {
  readonly action: 'created' | 'deleted' | 'suspend' | 'unsuspend' | 'new_permissions_accepted';
  readonly installation: {
    readonly id: number;
    readonly account: { readonly login: string; readonly type: string } | null;
  };
  readonly repositories?: readonly { readonly full_name: string }[];
}

export interface PushPayload {
  readonly ref: string;
  readonly installation?: { readonly id: number };
  readonly repository: { readonly full_name: string; readonly default_branch: string };
}

export type ParsedEvent =
  | { readonly kind: 'installation'; readonly payload: InstallationPayload }
  | { readonly kind: 'push'; readonly payload: PushPayload }
  | { readonly kind: 'unsupported'; readonly event: string };

export function parseGitHubEvent(event: string, body: unknown): ParsedEvent {
  switch (event) {
    case 'installation':
      return { kind: 'installation', payload: body as InstallationPayload };
    case 'installation_repositories':
      return { kind: 'installation', payload: body as InstallationPayload };
    case 'push':
      return { kind: 'push', payload: body as PushPayload };
    default:
      return { kind: 'unsupported', event };
  }
}
