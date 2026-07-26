export type KeySlotPolicy = {
  id: string;
  priority: number;
  enabled: boolean;
  configured: boolean;
  cooldownUntil?: number;
  failures?: number;
};
export declare const KEY_SLOT_IDS: readonly ["primary", "backup-1", "backup-2"];
export declare function maskProviderKey(value: string): string;
export declare function parseRetryAfter(value?: string | null, now?: number): number;
export declare function availableKeySlots<T extends KeySlotPolicy>(slots: T[], now?: number): T[];
export declare function createTaskDeduplicator(): {
  begin(taskId: string): boolean;
  finish(taskId: string): void;
  has(taskId: string): boolean;
};
