import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Phone, Plus, RotateCcw, Sparkles } from 'lucide-react';
import type { JournalEntry } from '@shared/api';
import { queryKeys, reflectOnEntry, updateJournalEntry } from '@/lib/api';

interface EntryReflectionProps {
  entry: JournalEntry;
  onEntryUpdated: (entry: JournalEntry) => void;
}

const actionButton =
  'flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60 disabled:opacity-60';

// "Reflect with Bubble" under a journal entry. The entry only goes to the AI when the
// person asks, and the reply is only kept if they add it to the entry.
export default function EntryReflection({ entry, onEntryUpdated }: EntryReflectionProps) {
  const queryClient = useQueryClient();
  const reflect = useMutation({ mutationFn: () => reflectOnEntry(entry.id) });
  const addToEntry = useMutation({
    mutationFn: () => {
      const result = reflect.data!;
      const addition = `Bubble's reflection: ${result.reflection}\nTo write about next: ${result.question}`;
      return updateJournalEntry(entry.id, { content: `${entry.content}\n\n${addition}` });
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.journal });
      onEntryUpdated(updated);
      reflect.reset();
    },
  });

  if (reflect.isIdle) {
    return (
      <div className="mt-6 border-t border-white/15 pt-5">
        <button onClick={() => reflect.mutate()} className={`${actionButton} bg-[#0b6bb8] text-white hover:bg-[#095a9c]`}>
          <Sparkles size={16} aria-hidden="true" />
          Reflect with Bubble
        </button>
        <p className="mt-2 text-sm text-white/85">
          Bubble reads this entry and shares a thought and a question to write about. Nothing is kept unless you add it.
        </p>
      </div>
    );
  }

  if (reflect.isPending) {
    return (
      <p className="mt-6 border-t border-white/15 pt-5 text-white/90" role="status">
        Bubble is reading your entry…
      </p>
    );
  }

  if (reflect.isError) {
    return (
      <div className="mt-6 border-t border-white/15 pt-5 text-white" role="alert">
        <p className="mb-3">Couldn't reach Bubble just now.</p>
        <button onClick={() => reflect.mutate()} className={`${actionButton} text-white surface-soft surface-soft-hover`}>
          <RotateCcw size={16} aria-hidden="true" />
          Try again
        </button>
      </div>
    );
  }

  const result = reflect.data!;
  return (
    <section className="mt-6 border-t border-white/15 pt-5 text-white" aria-label="Bubble's reflection">
      <div className="border-l-2 border-white/60 pl-4">
        <p className="leading-relaxed">{result.reflection}</p>
        <p className="mt-3 text-sm font-semibold text-white/85">To write about next</p>
        <p className="leading-relaxed">{result.question}</p>
      </div>

      {result.helplines && (
        <div className="mt-4 space-y-2">
          {result.helplines.map((line) => (
            <a
              key={line.phone}
              href={`tel:${line.phone.replace(/\s/g, '')}`}
              className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-gray-900"
            >
              <Phone className="h-5 w-5 shrink-0 text-[#0b5394]" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{line.name}</span>
                <span className="block text-xs text-gray-600">{line.hours}</span>
              </span>
              <span className="whitespace-nowrap font-bold text-[#0b5394]">{line.phone}</span>
            </a>
          ))}
        </div>
      )}

      {addToEntry.isError && (
        <p role="alert" className="mt-3 rounded-xl bg-white/90 px-3 py-2 text-sm text-red-800">
          Couldn't add it to your entry. Please try again.
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => addToEntry.mutate()}
          disabled={addToEntry.isPending}
          className={`${actionButton} bg-[#0b6bb8] text-white hover:bg-[#095a9c]`}
        >
          <Plus size={16} aria-hidden="true" />
          {addToEntry.isPending ? 'Adding…' : 'Add to my entry'}
        </button>
        <button onClick={() => reflect.reset()} className={`${actionButton} text-white surface-soft surface-soft-hover`}>
          Dismiss
        </button>
      </div>
    </section>
  );
}
