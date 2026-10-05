import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit, Lightbulb, Lock, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { JournalEntry } from '@shared/api';
import { Mood } from '@/models/types';
import { useSession } from '@/lib/authClient';

import {
  createJournalEntry,
  deleteJournalEntry,
  fetchJournal,
  queryKeys,
  updateJournalEntry,
} from '@/lib/api';
import { useAccountDialog } from '@/store/accountStore';
import { MOOD_LABELS, MOOD_ORDER } from '@/lib/moods';
import { pickPrompt } from '@/lib/journalPrompts';
import EntryReflection from './EntryReflection';

const formatDate = (iso: string) => new Date(iso).toLocaleDateString();

export default function JournalPanel() {
  const { data: session, isPending: sessionPending } = useSession();
  const { open: openAccount } = useAccountDialog();
  const queryClient = useQueryClient();
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [isViewingEntry, setIsViewingEntry] = useState(false);
  const [isEditingEntry, setIsEditingEntry] = useState(false);
  const [newEntryTitle, setNewEntryTitle] = useState('');
  const [newEntryContent, setNewEntryContent] = useState('');
  const [selectedMood, setSelectedMood] = useState<Mood>('neutral');
  const [currentEntry, setCurrentEntry] = useState<JournalEntry | null>(null);
  // A starting point for a blank page; using it fills in the title
  const [prompt, setPrompt] = useState(() => pickPrompt());

  const journal = useQuery({
    queryKey: queryKeys.journal,
    queryFn: fetchJournal,
    enabled: !!session,
  });
  const journalEntries = journal.data ?? [];

  const onSaved = () => queryClient.invalidateQueries({ queryKey: queryKeys.journal });

  const createEntry = useMutation({ mutationFn: createJournalEntry, onSuccess: onSaved });
  const updateEntry = useMutation({
    mutationFn: ({ id, ...input }: { id: string; title: string; content: string; mood: Mood }) =>
      updateJournalEntry(id, input),
    onSuccess: onSaved,
  });
  const removeEntry = useMutation({ mutationFn: deleteJournalEntry, onSuccess: onSaved });

  const isSaving = createEntry.isPending || updateEntry.isPending;
  const saveError = createEntry.error || updateEntry.error || removeEntry.error;

  // Save new journal entry
  const saveJournalEntry = async () => {
    if (newEntryTitle.trim() === '' || newEntryContent.trim() === '') {
      return; // Don't save empty entries
    }

    const input = { title: newEntryTitle, content: newEntryContent, mood: selectedMood };
    try {
      if (isEditingEntry && currentEntry) {
        await updateEntry.mutateAsync({ id: currentEntry.id, ...input });
        setCurrentEntry(null);
        setIsEditingEntry(false);
        setShowNewEntry(false);
        setIsViewingEntry(false);
      } else {
        await createEntry.mutateAsync(input);
        setNewEntryTitle('');
        setNewEntryContent('');
        setSelectedMood('neutral');
        setShowNewEntry(false);
      }
    } catch {
      // shown below the form via saveError; the draft is kept so nothing is lost
    }
  };

  // Delete journal entry
  const deleteEntry = async (id: string) => {
    try {
      await removeEntry.mutateAsync(id);
    } catch {
      return;
    }

    if (isViewingEntry || isEditingEntry) {
      setIsViewingEntry(false);
      setIsEditingEntry(false);
      setCurrentEntry(null);
    }
  };

  // View a specific entry
  const viewEntry = (entry: JournalEntry) => {
    setCurrentEntry(entry);
    setIsViewingEntry(true);
    setShowNewEntry(false);
  };

  // Edit a specific entry
  const editEntry = (entry: JournalEntry) => {
    setCurrentEntry(entry);
    setNewEntryTitle(entry.title);
    setNewEntryContent(entry.content);
    setSelectedMood(entry.mood);
    setIsEditingEntry(true);
    setShowNewEntry(true);
    setIsViewingEntry(false);
  };

  const applyPrompt = () => {
    setNewEntryTitle(prompt);
    document.getElementById('journal-entry-text')?.focus();
  };

  const resetForm = () => {
    setNewEntryTitle('');
    setNewEntryContent('');
    setSelectedMood('neutral');
    setIsEditingEntry(false);
    setCurrentEntry(null);
    setShowNewEntry(false);
    setPrompt(pickPrompt(prompt));
  };

  return (
    <motion.div
      className="h-full flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-white text-2xl md:text-3xl font-semibold tracking-tight text-center">Journal</h1>
        {session && !isViewingEntry && !showNewEntry && (
          <button
            onClick={() => setShowNewEntry(true)}
            className="flex items-center gap-1.5 rounded-full bg-[#0b6bb8] px-4 py-2 text-sm font-medium text-white hover:bg-[#095a9c] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New entry
          </button>
        )}
        {(isViewingEntry || showNewEntry) && (
          <button
            onClick={() => {
              setIsViewingEntry(false);
              setShowNewEntry(false);
              setIsEditingEntry(false);
              setCurrentEntry(null);
            }}
            aria-label="Back to your entries"
            className="rounded-full p-2 text-white hover:bg-white/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
          >
            <ArrowLeft className="w-6 h-6" aria-hidden="true" />
          </button>
        )}
      </div>

      {showNewEntry ? (
        // New entry form
        <div className="flex-1 surface rounded-3xl p-4 flex flex-col">
          {!isEditingEntry && !newEntryTitle && !newEntryContent && (
            <div className="mb-4 flex items-start gap-3 text-white">
              <Lightbulb className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white/85">Not sure where to start?</p>
                <p className="font-medium">{prompt}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={applyPrompt}
                    className="rounded-full bg-white px-3 py-1 text-sm font-medium text-[#0b3d66] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
                  >
                    Use this
                  </button>
                  <button
                    onClick={() => setPrompt(pickPrompt(prompt))}
                    className="flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium text-white surface-soft surface-soft-hover focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    Another one
                  </button>
                </div>
              </div>
            </div>
          )}
          <input
            type="text"
            value={newEntryTitle}
            onChange={(e) => setNewEntryTitle(e.target.value)}
            placeholder="Title"
            aria-label="Title"
            className="w-full bg-white/20 border-none outline-none text-white placeholder-white/80 mb-4 p-3 rounded-full"
          />

          <textarea
            id="journal-entry-text"
            aria-label="Entry"
            value={newEntryContent}
            onChange={(e) => setNewEntryContent(e.target.value)}
            placeholder="Write your thoughts here..."
            className="flex-1 w-full bg-white/20 border-none outline-none text-white placeholder-white/80 p-4 rounded-3xl resize-none mb-4"
          />

          <div className="mb-4">
            <div className="text-white mb-2">How were you feeling?</div>
            <div className="flex flex-wrap gap-2">
              {MOOD_ORDER.map((mood) => (
                <button
                  key={mood}
                  onClick={() => setSelectedMood(mood)}
                  aria-pressed={selectedMood === mood}
                  className={`rounded-full px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60 ${
                    selectedMood === mood ? 'bg-white text-[#0b3d66]' : 'surface-soft surface-soft-hover text-white'
                  }`}
                >
                  {MOOD_LABELS[mood]}
                </button>
              ))}
            </div>
          </div>

          {saveError && (
            <p role="alert" className="mb-3 rounded-xl bg-white/90 px-3 py-2 text-sm text-red-800">
              Couldn't save that. Your text is still here, please try again.
            </p>
          )}

          <div className="flex justify-between">
            <button
              onClick={resetForm}
              className="bg-white/20 text-white rounded-full px-4 py-2 flex items-center"
            >
              <X className="w-5 h-5 mr-2" />
              Cancel
            </button>
            <button
              onClick={saveJournalEntry}
              className="bg-[#0b6bb8] text-white rounded-full px-6 py-2 flex items-center"
              disabled={!newEntryTitle.trim() || !newEntryContent.trim() || isSaving}
            >
              <Save className="w-5 h-5 mr-2" />
              Save entry
            </button>
          </div>
        </div>
      ) : isViewingEntry && currentEntry ? (
        // View specific entry
        <div className="flex-1 surface rounded-3xl p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-white text-2xl font-bold">{currentEntry.title}</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => editEntry(currentEntry)}
                aria-label="Edit entry"
                className="text-white hover:text-sky-100"
              >
                <Edit className="w-5 h-5" />
              </button>
              <button
                onClick={() => deleteEntry(currentEntry.id)}
                aria-label="Delete entry"
                disabled={removeEntry.isPending}
                className="text-white hover:text-red-500"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center text-white/90 text-sm mb-4">
            <span>{formatDate(currentEntry.createdAt)}</span>
            <span className="mx-2">•</span>
            <span>{MOOD_LABELS[currentEntry.mood]}</span>
          </div>

          <div className="text-white whitespace-pre-wrap">
            {currentEntry.content}
          </div>

          <EntryReflection key={currentEntry.id} entry={currentEntry} onEntryUpdated={setCurrentEntry} />
        </div>
      ) : (
        // Journal entries list
        <div className="flex-1 overflow-y-auto space-y-3">
          {!session && !sessionPending ? (
            <div className="text-white text-center py-16 px-4">
              <Lock className="w-8 h-8 mx-auto mb-3 opacity-80" aria-hidden="true" />
              <p className="mb-1 text-lg font-semibold">Your journal is private</p>
              <p className="mb-5 text-white/80">Sign in so your entries are saved to your account and only you can read them.</p>
              <button
                onClick={openAccount}
                className="bg-white text-[#0b5394] font-semibold rounded-full px-6 py-2"
              >
                Sign in or create an account
              </button>
            </div>
          ) : journal.isPending ? (
            <p className="text-white/90 text-center py-20">Loading your journal...</p>
          ) : journal.isError ? (
            <div className="text-white text-center py-20">
              <p className="mb-4">Couldn't load your journal.</p>
              <button onClick={() => journal.refetch()} className="bg-white/20 rounded-full px-6 py-2">
                Try again
              </button>
            </div>
          ) : journalEntries.length === 0 ? (
            <div className="text-white/90 text-center py-20">
              <p className="mb-4">No journal entries yet</p>
              <button
                onClick={() => setShowNewEntry(true)}
                className="bg-[#0b6bb8] text-white rounded-full px-6 py-2 inline-flex items-center"
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Write your first entry
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {journalEntries.map((entry) => (
                <button
                  key={entry.id}
                  className="surface rounded-3xl p-4 text-left text-white hover:bg-white/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
                  onClick={() => viewEntry(entry)}
                >
                  <h3 className="font-bold mb-2 truncate">{entry.title}</h3>
                  <p className="text-sm text-white/90 mb-4 line-clamp-2">{entry.content}</p>
                  <div className="flex justify-between items-center text-xs text-white/90">
                    <span>{MOOD_LABELS[entry.mood]}</span>
                    <span>{formatDate(entry.createdAt)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}