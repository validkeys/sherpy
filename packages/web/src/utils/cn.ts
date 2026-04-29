/**
 * className Utility
 *
 * Combines class names using clsx and resolves Tailwind conflicts
 * with tailwind-merge. Used by all shadcn components.
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
