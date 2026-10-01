import { Phone, Wind } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSosStore } from '@/store/sosStore';
import { HELPLINES } from '@shared/safety';

interface SosScreenProps {
  onBreathe: () => void;
}

export default function SosScreen({ onBreathe }: SosScreenProps) {
  const { isOpen, close } = useSosStore();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-h-[92vh] w-[calc(100%-2rem)] overflow-y-auto rounded-3xl border-0 bg-white p-6 text-gray-900 sm:rounded-3xl">
        <DialogHeader className="text-left">
          <DialogTitle className="pr-6 text-2xl font-bold leading-tight text-gray-900">
            You don't have to face this alone
          </DialogTitle>
          <DialogDescription className="text-base text-gray-700">
            Someone is available to talk 24 hours a day. Tap a number to call.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {HELPLINES.map((line) => (
            <a
              key={line.phone}
              href={`tel:${line.phone.replace(/\s/g, '')}`}
              className="flex min-h-[64px] items-center gap-4 rounded-2xl bg-[#0b5394] px-4 py-3 text-white shadow-md focus:outline-none focus:ring-4 focus:ring-[#0b5394]/40"
            >
              <Phone className="h-6 w-6 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{line.name}</span>
                {/* On phones the number goes under the name so the name isn't squeezed */}
                <span className="block text-lg font-bold tracking-wide sm:hidden">{line.phone}</span>
                <span className="block text-sm text-white/90">{line.hours}</span>
              </span>
              <span className="hidden text-lg font-bold tracking-wide sm:block">{line.phone}</span>
            </a>
          ))}
        </div>

        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-900">
          If you're in immediate danger, call 112 or go to your nearest hospital emergency unit.
        </p>

        <div className="rounded-2xl bg-[#e8f4fd] p-4">
          <p className="mb-2 font-semibold text-gray-900">While you reach out</p>
          <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-gray-800">
            <li>Message or call someone you trust and tell them how you're feeling.</li>
            <li>If you can, put some distance between yourself and anything you could use to hurt yourself.</li>
            <li>Slow your breathing. In for 4, hold, out for 4.</li>
          </ul>
          <button
            onClick={onBreathe}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-3 font-semibold text-[#0b5394] shadow-sm focus:outline-none focus:ring-4 focus:ring-[#0b5394]/30"
          >
            <Wind className="h-5 w-5" aria-hidden="true" />
            Breathe with Bubble
          </button>
        </div>

        <button
          onClick={close}
          className="w-full rounded-full px-4 py-3 font-medium text-gray-700 underline-offset-4 hover:underline focus:outline-none focus:ring-4 focus:ring-gray-300"
        >
          I'm safe for now, back to Bubble
        </button>
      </DialogContent>
    </Dialog>
  );
}
