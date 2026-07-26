export type IntegrityRecord = { algorithm: "SHA-256"; digest: string };
export declare function stableValue<T>(value: T): T;
export declare function canonicalStringify(value: unknown): string;
export declare function sha256Hex(input: string): string;
export declare function createIntegrity(payload: unknown): IntegrityRecord;
export declare function verifyIntegrity(payload: unknown, integrity?: Partial<IntegrityRecord>): boolean;
