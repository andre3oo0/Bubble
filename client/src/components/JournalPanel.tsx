import { useState } from 'react';
import { Lock, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { JournalEntry } from '@shared/api';
import { Mood } from '@/models/types';
import { useSession } from '@/lib/authClient';
import { createJournalEntry, deleteJournalEntry, fetchJournal, queryKeys, updateJournalEntry } from '@/lib/api';
import { dateTitle, formatDay, formatDayAndTime } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { useAccountDialog } from '@/store/accountStore';
import { MOOD_LABELS, MOOD_ORDER } from '@/lib/moods';
import { pickPrompt } from '@/lib/journalPrompts';
import EmptyState from './EmptyState';
import EntryReflection from './EntryReflection';
import PageHeader from './PageHeader';
import { JournalSkeleton } from './Skeleton';
import { buttonClass, chipClass, fieldClass, focusRing, labelClass, noticeClass } from './ui/controls';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ToastAction } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { UNDO_MS, useJournalDelete } from '@/store/journalDeleteStore';

export { dateTitle };

type View = 'list' | 'entry' | 'editor';
interface Draft {
  title: string;
  content: string;
  mood: Mood;
}

const EMPTY_DRAFT: Draft = { title: '', content: '', mood: 'neutral' };

const dialogClass = 'w-[calc(100%-2rem)] max-w-md border-0 p-6';

export default function JournalPanel() {
  const { data: session, isPending: sessionPending } = useSession();
  const { open: openAccount } = useAccountDialog();
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>('list');
  const [currentEntry, setCurrentEntry] = useState<JournalEntry | null>(null);
  // The editor works on a draft, compared with what it started from to know whether
  // leaving would lose anything
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [startedFrom, setStartedFrom] = useState<Draft>(EMPTY_DRAFT);
  const [editingExisting, setEditingExisting] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
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
    mutationFn: ({ id, ...input }: { id: string; title: string; content: string; mood: Mood }) => updateJournalEntry(id, input),
    onSuccess: onSaved,
  });

  const isSaving = createEntry.isPending || updateEntry.isPending;
  const saveError = createEntry.error || updateEntry.error;
  const isDirty =
    draft.title !== startedFrom.title || draft.content !== startedFrom.content || draft.mood !== startedFrom.mood;

  const openEditor = (entry: JournalEntry | null) => {
    const start = entry ? { title: entry.title, content: entry.content, mood: entry.mood } : EMPTY_DRAFT;
    createEntry.reset();
    updateEntry.reset();
    setDraft(start);
    setStartedFrom(start);
    setEditingExisting(!!entry);
    setCurrentEntry(entry);
    setView('editor');
  };

  // Always clears the draft, so the next new entry starts blank
  const closeEditor = () => {
    setDiscardOpen(false);
    setDraft(EMPTY_DRAFT);
    setStartedFrom(EMPTY_DRAFT);
    setPrompt(pickPrompt(prompt));
    setView(editingExisting && currentEntry ? 'entry' : 'list');
    setEditingExisting(false);
  };

  // Cancel and the back arrow: ask first if there's unsaved writing
  const leaveEditor = () => (isDirty ? setDiscardOpen(true) : closeEditor());

  const saveDraft = async () => {
    if (draft.content.trim() === '' || isSaving) return;
    // The title is optional: a blank one becomes the entry's date
    const title =
      draft.title.trim() || dateTitle(editingExisting && currentEntry ? new Date(currentEntry.createdAt) : new Date());
    const input = { title, content: draft.content, mood: draft.mood };
    try {
      if (editingExisting && currentEntry) {
        const updated = await updateEntry.mutateAsync({ id: currentEntry.id, ...input });
        setCurrentEntry(updated);
      } else {
        await createEntry.mutateAsync(input);
        toast({ title: 'Entry saved', description: 'Only you can see it.' });
      }
      closeEditor();
    } catch {
      // shown in the form via saveError; the draft is kept so nothing is lost
    }
  };

  // Delete after confirming, with a few seconds to undo
  const deleteEntry = (entry: JournalEntry) => {
    setDeleteDialogOpen(false);
    setCurrentEntry(null);
    setView('list');
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

  const viewEntry = (entry: JournalEntry) => {
    setCurrentEntry(entry);
    setView('entry');
  };

  const header =
    view === 'editor' ? (
      <PageHeader title="Journal" onBack={leaveEditor} backLabel="Back" focusKey={view} />
    ) : view === 'entry' ? (
      <PageHeader
        title="Journal"
        onBack={() => {
          setCurrentEntry(null);
          setView('list');
        }}
        backLabel="Back to your entries"
        focusKey={view}
      />
    ) : (
      <PageHeader
        title="Journal"
        focusKey={view}
        action={
          session && journalEntries.length > 0 ? (
            <button onClick={() => openEditor(null)} className={buttonClass({ size: 'sm' })}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New entry
            </button>
          ) : undefined
        }
      />
    );

  return (
    <div className="flex h-full flex-col">
      {header}

      {view === 'editor' ? (
        <form
          className="surface flex flex-1 flex-col gap-4 rounded-[8px] p-4"
          onSubmit={(e) => {
            e.preventDefault();
            saveDraft();
          }}
        >
          {!editingExisting && !draft.title && !draft.content && (
            <div className="border-b border-white/15 pb-4 text-white">
              <p className="text-sm text-white/85">Not sure where to start? Try this:</p>
              <p className="mt-0.5 font-medium">{prompt}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDraft({ ...draft, title: prompt });
                    document.getElementById('journal-entry-text')?.focus();
                  }}
                  className={buttonClass({ variant: 'secondary', size: 'sm' })}
                >
                  Use this
                </button>
                <button type="button" onClick={() => setPrompt(pickPrompt(prompt))} className={buttonClass({ variant: 'tertiary', size: 'sm' })}>
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Another one
                </button>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="journal-entry-title" className={labelClass.dark}>
              Title <span className="font-normal text-white/75">(optional)</span>
            </label>
            <input
              id="journal-entry-title"
              type="text"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              maxLength={200}
              className={fieldClass.dark}
            />
          </div>

          <div className="flex flex-1 flex-col">
            <label htmlFor="journal-entry-text" className={labelClass.dark}>
              Entry
            </label>
            <textarea
              id="journal-entry-text"
              value={draft.content}
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              placeholder="Write your thoughts here…"
              className={cn(fieldClass.dark, 'min-h-[10rem] flex-1 resize-none leading-relaxed')}
            />
          </div>

          <fieldset>
            <legend className={labelClass.dark}>How were you feeling?</legend>
            <div className="flex flex-wrap gap-2">
              {MOOD_ORDER.map((mood) => (
                <button
                  key={mood}
                  type="button"
                  onClick={() => setDraft({ ...draft, mood })}
                  aria-pressed={draft.mood === mood}
                  className={chipClass(draft.mood === mood)}
                >
                  {MOOD_LABELS[mood]}
                </button>
              ))}
            </div>
          </fieldset>

          {saveError && (
            <p role="alert" className={noticeClass.error}>
              Couldn't save that. Your writing is still here, please try again.
            </p>
          )}

          <div className="flex justify-between gap-3">
            <button type="button" onClick={leaveEditor} className={buttonClass({ variant: 'secondary' })}>
              Cancel
            </button>
            <button type="submit" disabled={!draft.content.trim() || isSaving} className={buttonClass({ className: 'px-6' })}>
              {isSaving ? 'Saving…' : editingExisting ? 'Save changes' : 'Save entry'}
            </button>
          </div>
        </form>
      ) : view === 'entry' && currentEntry ? (
        <article className="surface flex-1 overflow-y-auto rounded-[8px] p-5 text-white">
          <div className="flex items-start gap-3">
            <h2 className="min-w-0 flex-1 break-words text-2xl font-semibold">{currentEntry.title}</h2>
            <button onClick={() => openEditor(currentEntry)} className={buttonClass({ variant: 'secondary', size: 'sm' })}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit
            </button>
          </div>
          <p className="mt-1 text-sm text-white/80">
            {formatDayAndTime(new Date(currentEntry.createdAt))}
            <span aria-hidden="true" className="mx-2">·</span>
            {MOOD_LABELS[currentEntry.mood]}
          </p>

          <div className="mt-4 whitespace-pre-wrap leading-relaxed">{currentEntry.content}</div>

          <EntryReflection key={currentEntry.id} entry={currentEntry} onEntryUpdated={setCurrentEntry} />

          <div className="mt-6 border-t border-white/15 pt-4">
            <button
              onClick={() => {
                setConfirmingDelete(currentEntry);
                setDeleteDialogOpen(true);
              }}
              className={buttonClass({ variant: 'danger', size: 'sm' })}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete entry
            </button>
          </div>
        </article>
      ) : (
        <div className="flex-1 space-y-3 overflow-y-auto">
          {!session && !sessionPending ? (
            <EmptyState
              icon={Lock}
              title="Your journal is private"
              action={
                <button onClick={() => openAccount()} className={buttonClass()}>
                  Sign in or create an account
                </button>
              }
            >
              Sign in so your entries are saved to your account and only you can read them.
            </EmptyState>
          ) : journal.isPending ? (
            <JournalSkeleton />
          ) : journal.isError ? (
            <EmptyState
              title="Couldn't load your journal"
              action={
                <button onClick={() => journal.refetch()} className={buttonClass({ variant: 'secondary' })}>
                  Try again
                </button>
              }
            >
              Check your connection and try again. Your entries are safe.
            </EmptyState>
          ) : journalEntries.length === 0 ? (
            <EmptyState
              title="No entries yet"
              action={
                <button onClick={() => openEditor(null)} className={buttonClass()}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Write your first entry
                </button>
              }
            >
              Your entries will show up here. Write about your day, or use a prompt to get started.
            </EmptyState>
          ) : (
            <>
              <div className="relative">
                <label htmlFor="journal-search" className="sr-only">
                  Search your journal
                </label>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/80" aria-hidden="true" />
                <input
                  id="journal-search"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search your journal"
                  className={cn(fieldClass.dark, 'pl-9')}
                />
              </div>
              {shownEntries.length === 0 ? (
                <EmptyState
                  title={`No entries match "${search.trim()}"`}
                  action={
                    <button onClick={() => setSearch('')} className={buttonClass({ variant: 'secondary', size: 'sm' })}>
                      Clear search
                    </button>
                  }
                />
              ) : (
                // A list, not a grid of cards: journals are read in date order
                <ul className="surface divide-y divide-white/10 overflow-hidden rounded-[8px]">
                  {shownEntries.map((entry) => (
                    <li key={entry.id}>
                      <button
                        className={cn('block w-full px-4 py-3 text-left text-white hover:bg-white/10 focus-visible:ring-inset', focusRing.dark)}
                        onClick={() => viewEntry(entry)}
                      >
                        <span className="flex justify-between gap-3 text-xs text-white/80">
                          <span>{formatDay(new Date(entry.createdAt))}</span>
                          <span>{MOOD_LABELS[entry.mood]}</span>
                        </span>
                        <span className="mt-0.5 block truncate font-semibold">{entry.title}</span>
                        <span className="block truncate text-sm text-white/80">{entry.content}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className={dialogClass}>
          <DialogHeader className="text-left">
            <DialogTitle className="pr-10 text-xl font-bold text-[#0b3d66]">Delete "{confirmingDelete?.title}"?</DialogTitle>
            <DialogDescription className="text-base text-gray-700">
              It will be removed from your journal. You'll have a few seconds to undo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => confirmingDelete && deleteEntry(confirmingDelete)}
              className={buttonClass({ tone: 'light', variant: 'danger', className: 'w-full' })}
            >
              <Trash2 size={18} aria-hidden="true" />
              Delete entry
            </button>
            <button onClick={() => setDeleteDialogOpen(false)} className={buttonClass({ tone: 'light', variant: 'secondary', className: 'w-full' })}>
              Keep it
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <DialogContent className={dialogClass}>
          <DialogHeader className="text-left">
            <DialogTitle className="pr-10 text-xl font-bold text-[#0b3d66]">
              {editingExisting ? 'Discard your changes?' : 'Discard this entry?'}
            </DialogTitle>
            <DialogDescription className="text-base text-gray-700">
              What you've written here hasn't been saved and will be lost.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <button onClick={() => setDiscardOpen(false)} className={buttonClass({ tone: 'light', className: 'w-full' })}>
              Keep writing
            </button>
            <button onClick={closeEditor} className={buttonClass({ tone: 'light', variant: 'danger', className: 'w-full' })}>
              Discard
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
