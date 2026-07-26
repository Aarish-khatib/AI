export declare const ANONYMOUS_WORKSPACE: "anonymous";
export declare function workspaceScopeForUser(userId?: string | null): string;
export declare function databaseNameForWorkspace(scope: string): string;
export declare function settingMayCrossWorkspace(key: string): boolean;
export declare function copySafeWorkspaceData<T extends Record<string, unknown>>(source: T): {
  chats: unknown[];
  media: unknown[];
  assets: unknown[];
  projects: unknown[];
  versions: unknown[];
  memory: unknown[];
  settings: Record<string, unknown>;
};
