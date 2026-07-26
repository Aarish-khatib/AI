export type RevisionedRecord = { revision: number };
export declare function payloadEqual(left: unknown, right: unknown): boolean;
export declare function decideRevisionMerge(
  local: RevisionedRecord | undefined,
  incoming: RevisionedRecord,
  equal?: (left: unknown, right: unknown) => boolean,
): "insert" | "replace-and-recover-local" | "keep-local" | "same" | "preserve-branch";
export declare function remoteWriteResult(
  local: RevisionedRecord,
  remote: { revision: number; payload: unknown } | undefined,
  applied: boolean,
  equal?: (left: unknown, right: unknown) => boolean,
): "uploaded" | "retry" | "download-remote" | "preserve-local-conflict";
