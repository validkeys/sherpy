/**
 * Project State Atoms
 *
 * App-level jotai atoms for managing current project context.
 * Used across features to access the active project ID.
 */

import { atom } from 'jotai';

/**
 * Current project ID atom.
 * Set by the ProjectPage when route params change.
 * Read by features that need the current project context (Sidebar, Files, Chat).
 *
 * Defaults to null when no project is loaded.
 */
export const currentProjectIdAtom = atom<string | null>(null);
