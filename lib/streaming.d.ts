export type NormalizedStreamEvent = {
  text?: string;
  error?: string;
  done?: boolean;
  malformed?: boolean;
};
export declare function normalizeStreamEvent(event: unknown): NormalizedStreamEvent;
export declare function createSseDecoder(onEvent: (event: NormalizedStreamEvent) => void): {
  push(chunk: string): void;
  finish(): void;
};
export declare function createTextBatcher(
  onFlush: (completeText: string) => void,
  options?: {
    delay?: number;
    schedule?: (callback: () => void) => unknown;
    cancel?: (handle: unknown) => void;
  },
): { push(completeText: string): void; flush(): void; cancel(): void };
export declare function branchMessages<T extends { id: string }>(
  messages: T[],
  messageId: string,
  options?: { includeTarget?: boolean },
): T[];
