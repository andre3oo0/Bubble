import { Phone, Wind } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSosStore } from '@/store/sosStore';
import { EMERGENCY_NUMBER, HELPLINES } from '@shared/safety';

// The buttons that open this screen. Plain words and a quiet outline: easy to find on
// every screen without shouting. Red is kept for the danger line inside.
export const helpButtonClass =
  'inline-flex shrink-0 items-center gap-1.5 rounded-[8px] border border-white/40 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60';

const tel = (phone: string) => `tel:${phone.replace(/\s/g, '')}`;

interface SosScreenProps {
  onBreathe: () => void;
}

export default function SosScreen({ onBreathe }: SosScreenProps) {
  const { isOpen, close } = useSosStore();
  const lines = HELPLINES.filter((line) => line.phone !== EMERGENCY_NUMBER);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      {/* Full screen on phones, so nothing else competes with it */}
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col gap-5 overflow-y-auto rounded-none border-0 bg-white px-5 pb-6 pt-12 text-gray-900 sm:h-auto sm:max-h-[92vh] sm:max-w-lg sm:rounded-[8px] sm:p-8">
        <DialogHeader className="text-left">
          <DialogTitle className="pr-6 text-2xl font-bold leading-tight text-[#0b3d66]">
            You don't have to face this alone
          </DialogTitle>
          <DialogDescription className="text-base text-gray-700">
            Someone is available to talk 24 hours a day. Tap a number to call.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-[8px] border border-red-700 px-4 py-3">
          <p className="min-w-0 flex-1 text-sm leading-snug">
            <span className="font-semibold">In immediate danger?</span> Call {EMERGENCY_NUMBER} or go to your nearest
            hospital emergency unit.
          </p>
          <a
            href={tel(EMERGENCY_NUMBER)}
            aria-label={`Call ${EMERGENCY_NUMBER}`}
            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-[8px] bg-red-700 px-4 font-bold text-white hover:bg-red-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-300"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            {EMERGENCY_NUMBER}
          </a>
        </div>

        <ul className="border-t border-gray-200">
          {lines.map((line) => (
            <li key={line.phone} className="border-b border-gray-200">
              <a
                href={tel(line.phone)}
                className="flex min-h-[72px] items-center gap-3 py-3 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0b5394]/40"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{line.name}</span>
                  <span className="block text-sm text-gray-600">{line.hours}</span>
                </span>
                <span className="flex items-center gap-2 whitespace-nowrap text-lg font-bold text-[#0b5394]">
                  {line.phone}
                  <Phone className="h-4 w-4" aria-hidden="true" />
                </span>
              </a>
            </li>
          ))}
        </ul>

        <div className="text-[15px] leading-relaxed">
          <p className="mb-1 font-semibold text-[#0b3d66]">While you reach out</p>
          <ul className="list-disc space-y-1 pl-5 text-gray-800">
            <li>Message or call someone you trust and tell them how you're feeling.</li>
            <li>If you can, put some distance between yourself and anything you could use to hurt yourself.</li>
            <li>Slow your breathing. In for 4, hold, out for 4.</li>
          </ul>
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-2">
          <button
            onClick={onBreathe}
            className="flex h-12 items-center justify-center gap-2 rounded-[8px] border border-[#0b5394] font-semibold text-[#0b5394] hover:bg-[#0b5394]/5 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0b5394]/30"
          >
            <Wind className="h-5 w-5" aria-hidden="true" />
            Breathe with Bubble
          </button>
          <button
            onClick={close}
            className="rounded-[8px] px-4 py-3 font-medium text-gray-700 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-4 focus-visible:ring-gray-300"
          >
            I'm safe for now, back to Bubble
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
