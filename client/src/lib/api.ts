import type { EntryReflection, JournalEntry, JournalEntryInput, MoodCheckin } from '@shared/api';
import type { Mood } from '@shared/chat';
import { apiRequest } from './queryClient';

export const queryKeys = {
  journal: ['journal'] as const,
  moods: ['moods'] as const,
  authOptions: ['auth-options'] as const,
};

export interface AuthOptions {
  google: boolean;
}

export async function fetchAuthOptions(): Promise<AuthOptions> {
  return (await apiRequest('GET', '/api/auth-options')).json();
}

export async function fetchJournal(): Promise<JournalEntry[]> {
  return (await apiRequest('GET', '/api/journal')).json();
}

export async function createJournalEntry(input: JournalEntryInput): Promise<JournalEntry> {
  return (await apiRequest('POST', '/api/journal', input)).json();
}

export async function updateJournalEntry(id: string, input: Partial<JournalEntryInput>): Promise<JournalEntry> {
  return (await apiRequest('PATCH', `/api/journal/${id}`, input)).json();
}

export async function reflectOnEntry(id: string): Promise<EntryReflection> {
  return (await apiRequest('POST', `/api/journal/${id}/reflect`)).json();
}

export async function deleteJournalEntry(id: string): Promise<void> {
  await apiRequest('DELETE', `/api/journal/${id}`);
}

export async function fetchMoods(): Promise<MoodCheckin[]> {
  return (await apiRequest('GET', '/api/moods?days=30')).json();
}

export async function saveMoodCheckin(mood: Mood): Promise<MoodCheckin> {
  return (await apiRequest('POST', '/api/moods', { mood })).json();
}
