import { WifiOff } from 'lucide-react';
import { HELPLINES } from '@shared/safety';
import { useOnline } from '@/lib/online';
import { useSosStore } from '@/store/sosStore';

// Shown on every screen while the device is offline. The helplines are phone calls,
// so they still work: the first one is right here, the rest one tap away.
export default function OfflineBanner() {
  const online = useOnline();
  const { open: openSos } = useSosStore();
  if (online) return null;

  const line = HELPLINES[0];
  return (
    <div role="status" className="mb-3 flex gap-3 rounded-[8px] bg-[#0b5394] px-4 py-3 text-sm leading-snug text-white">
      <WifiOff className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1">
        You're offline. Bubble can't reply until you reconnect. Helplines still work:{' '}
        <a href={`tel:${line.phone.replace(/\s/g, '')}`} className="whitespace-nowrap font-bold underline underline-offset-2">
          {line.phone}
        </a>{' '}
        ({line.name}).{' '}
        <button
          onClick={openSos}
          aria-haspopup="dialog"
          className="font-bold underline underline-offset-2 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60 rounded"
        >
          All helplines
        </button>
      </p>
    </div>
  );
}
