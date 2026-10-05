import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit, Lightbulb, Lock, Plus, RefreshCw, Save, Search, Trash2, X } from 'lucide-react';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ToastAction } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { UNDO_MS, useJournalDelete } from '@/store/journalDeleteStore';

const formatDate = (iso: string) => new Date(iso).toLocaleDateString();

// Used as the title when someone leaves it blank, e.g. "Sunday 5 October"
export const dateTitle = (date: Date) =>
  `${date.toLocaleDateString('en-ZA', { weekday: 'long' })} ${date.getDate()} ${date.toLocaleDateString('en-ZA', { month: 'long' })}`;

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
  const [search, setSearch] = useState('');
  // Kept after the dialog closes so its title doesn't go blank while it fades out
  const [confirmingDelete, setConfirmingDelete] = useState<JournalEntry | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { hidden, schedule, undo } = useJournalDelete();
  const { toast } = useToast();

  const journal = useQuery({
    queryKey: queryKeys.journal,
    queryFn: fetchJournal,
    enabled: !!session,
  });
  // Entries waiting out their undo window are already hidden
  const journalEntries = (journal.data ?? []).filter((entry) => !hidden.includes(entry.id));
  const query = search.trim().toLowerCase();
  const shownEntries = query
    ? journalEntries.filter((entry) => `${entry.title}\n${entry.content}`.toLowerCase().includes(query))
    : journalEntries;

  const onSaved = () => queryClient.invalidateQueries({ queryKey: queryKeys.journal });

  const createEntry = useMutation({ mutationFn: createJournalEntry, onSuccess: onSaved });
  const updateEntry = useMutation({
    mutationFn: ({ id, ...input }: { id: string; title: string; content: string; mood: Mood }) =>
      updateJournalEntry(id, input),
    onSuccess: onSaved,
  });

  const isSaving = createEntry.isPending || updateEntry.isPending;
  const saveError = createEntry.error || updateEntry.error;

  // Save new journal entry
  const saveJournalEntry = async () => {
    if (newEntryContent.trim() === '') {
      return; // Don't save empty entries
    }

    // The title is optional: a blank one becomes the entry's date
    const title =
      newEntryTitle.trim() ||
      dateTitle(isEditingEntry && currentEntry ? new Date(currentEntry.createdAt) : new Date());
    const input = { title, content: newEntryContent, mood: selectedMood };
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

  // Delete after confirming, with a few seconds to undo
  const deleteEntry = (entry: JournalEntry) => {
    setDeleteDialogOpen(false);
    setIsViewingEntry(false);
    setIsEditingEntry(false);
    setCurrentEntry(null);
    schedule(
      entry.id,
      async () => {
        await deleteJournalEntry(entry.id);
        await onSaved();
      },
      () => toast({ title: "Couldn't delete that entry", description: "It's back in your journal. Please try again." }),
    );
    toast({
      title: 'Entry deleted',
      duration: UNDO_MS,
      action: (
        <ToastAction altText="Undo deleting the entry" onClick={() => undo(entry.id)}>
          Undo
        </ToastAction>
      ),
    });
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
            placeholder="Title (optional)"
            aria-label="Title, optional"
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
              disabled={!newEntryContent.trim() || isSaving}
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
                onClick={() => {
                  setConfirmingDelete(currentEntry);
                  setDeleteDialogOpen(true);
                }}
                aria-label="Delete entry"
                className="text-white hover:text-red-300"
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
            <>
            <label className="flex items-center gap-2 rounded-full px-4 py-2 text-white surface focus-within:ring-4 focus-within:ring-white/40">
              <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="sr-only">Search your journal</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your journal"
                className="w-full bg-transparent text-white outline-none placeholder-white/80"
              />
            </label>
            {shownEntries.length === 0 && (
              <div className="py-12 text-center text-white">
                <p className="mb-3">No entries match "{search.trim()}".</p>
                <button
                  onClick={() => setSearch('')}
                  className="rounded-full px-4 py-2 text-sm font-medium surface-soft surface-soft-hover focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
                >
                  Clear search
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {shownEntries.map((entry) => (
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
            </>
          )}
        </div>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-3xl border-0 bg-white p-6 text-gray-900 sm:rounded-3xl">
          <DialogHeader className="text-left">
            <DialogTitle className="pr-6 text-xl font-bold">Delete "{confirmingDelete?.title}"?</DialogTitle>
            <DialogDescription className="text-base text-gray-700">
              It will be removed from your journal. You'll have a few seconds to undo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => confirmingDelete && deleteEntry(confirmingDelete)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 py-3 font-medium text-white hover:bg-red-800 focus:outline-none focus:ring-4 focus:ring-red-300"
            >
              <Trash2 size={18} aria-hidden="true" />
              Delete entry
            </button>
            <button
              onClick={() => setDeleteDialogOpen(false)}
              className="w-full rounded-xl bg-gray-100 py-3 font-medium text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-4 focus:ring-gray-300"
            >
              Keep it
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}