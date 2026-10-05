import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Trash2, X, ArrowLeft, Edit, Lock } from 'lucide-react';
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
  
  const moods: Record<Mood, { label: string, icon: string }> = {
    happy: { label: 'Happy', icon: '😊' },
    calm: { label: 'Calm', icon: '😌' },
    neutral: { label: 'Neutral', icon: '😐' },
    sad: { label: 'Sad', icon: '😔' },
    anxious: { label: 'Anxious', icon: '😰' },
    stressed: { label: 'Stressed', icon: '😖' },
    improved: { label: 'Improved', icon: '😌' }
  };

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

  const resetForm = () => {
    setNewEntryTitle('');
    setNewEntryContent('');
    setSelectedMood('neutral');
    setIsEditingEntry(false);
    setCurrentEntry(null);
    setShowNewEntry(false);
  };

  return (
    <motion.div 
      className="h-full flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex justify-between items-center mb-4">
        <div className="text-white text-3xl md:text-4xl font-bold text-center">JOURNAL</div>
        {session && !isViewingEntry && !showNewEntry && (
          <button 
            onClick={() => setShowNewEntry(true)}
            className="bg-[#0b6bb8] rounded-full w-10 h-10 flex items-center justify-center text-white"
          >
            <span className="text-2xl font-bold">+</span>
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
            className="text-white hover:text-sky-100 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        )}
      </div>
      
      {showNewEntry ? (
        // New entry form
        <div className="flex-1 bg-[#3498db]/30 rounded-3xl p-4 glassmorphism flex flex-col">
          <input
            type="text"
            value={newEntryTitle}
            onChange={(e) => setNewEntryTitle(e.target.value)}
            placeholder="Title"
            className="w-full bg-white/20 border-none outline-none text-white placeholder-white/80 mb-4 p-3 rounded-full"
          />
          
          <textarea
            value={newEntryContent}
            onChange={(e) => setNewEntryContent(e.target.value)}
            placeholder="Write your thoughts here..."
            className="flex-1 w-full bg-white/20 border-none outline-none text-white placeholder-white/80 p-4 rounded-3xl resize-none mb-4"
          />
          
          <div className="mb-4">
            <div className="text-white mb-2">How were you feeling?</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(moods).map(([moodKey, { label, icon }]) => (
                <motion.button
                  key={moodKey}
                  onClick={() => setSelectedMood(moodKey as Mood)}
                  className={`rounded-full py-1 px-3 flex items-center ${
                    selectedMood === moodKey 
                      ? 'bg-[#0b6bb8] text-white' 
                      : 'bg-[#9AD9EA]/50 text-white/90'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="mr-1">{icon}</span>
                  <span className="text-sm">{label}</span>
                </motion.button>
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
              Save Entry
            </button>
          </div>
        </div>
      ) : isViewingEntry && currentEntry ? (
        // View specific entry
        <div className="flex-1 bg-[#3498db]/30 rounded-3xl p-6 glassmorphism overflow-y-auto">
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
            <span className="flex items-center">
              {moods[currentEntry.mood].icon} {moods[currentEntry.mood].label}
            </span>
          </div>
          
          <div className="text-white whitespace-pre-wrap">
            {currentEntry.content}
          </div>
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
                <span className="mr-2">+</span>
                Write your first entry
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {journalEntries.map((entry) => (
                <motion.div 
                  key={entry.id}
                  className="bg-[#3498db]/30 rounded-3xl p-4 text-white glassmorphism cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                  onClick={() => viewEntry(entry)}
                >
                  <h3 className="font-bold mb-2 truncate">{entry.title}</h3>
                  <p className="text-sm text-white/90 mb-4 line-clamp-2">{entry.content}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-lg">{moods[entry.mood].icon}</span>
                    <p className="text-xs text-white/90">{formatDate(entry.createdAt)}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}