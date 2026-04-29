/**
 * Type Utilities
 *
 * Type guards and utility types for TypeScript.
 */

/**
 * Type guard: check if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Type guard: check if value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

/**
 * Type guard: check if value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard: check if value is an object (not null, not array)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Utility type: make specific properties nullable
 */
export type Nullable<T> = T | null;

/**
 * Utility type: make specific properties optional
 */
export type Optional<T> = T | undefined;

/**
 * Utility type: make all properties nullable
 */
export type DeepNullable<T> = {
  [K in keyof T]: T[K] | null;
};

/**
 * Utility type: make all properties required and non-nullable
 */
export type DeepRequired<T> = {
  [K in keyof T]-?: NonNullable<T[K]>;
};
