import { atom } from 'jotai';

export const activeTabAtom = atom<'chat' | 'files'>('chat');
