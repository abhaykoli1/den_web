export function isRecord(value: unknown): value is Record<string, unknown>
export function validateClubDataRoot(value: unknown): Record<string, unknown>
export function readRecords<T>(value: unknown, path: string, requiredStrings?: string[]): T[]
export function readStrings(value: unknown, path: string): string[]
