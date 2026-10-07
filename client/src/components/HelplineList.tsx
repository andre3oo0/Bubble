import { Phone } from 'lucide-react';
import type { Helpline } from '@shared/chat';
import { HELPLINES } from '@shared/safety';
import { cn } from '@/lib/utils';
import { focusRing, type Tone } from './ui/controls';

const tel = (phone: string) => `tel:${phone.replace(/\s/g, '')}`;

// The helplines look the same wherever they appear (help screen, chat, end of chat,
// journal reflections, 404), so they're recognised at a glance: name and hours on the
// left, the number to tap on the right
export default function HelplineList({
  lines = HELPLINES,
  tone = 'light',
  className,
}: {
  lines?: Helpline[];
  tone?: Tone;
  className?: string;
}) {
  const dark = tone === 'dark';
  return (
    <ul className={cn('divide-y', dark ? 'divide-white/15 border-y border-white/15' : 'divide-black/10 border-y border-black/10', className)}>
      {lines.map((line) => (
        <li key={line.phone}>
          <a href={tel(line.phone)} className={cn('flex min-h-14 items-center gap-3 py-2.5 focus:outline-none', focusRing[tone])}>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold leading-snug">{line.name}</span>
              <span className={cn('block text-sm', dark ? 'text-white/75' : 'text-gray-700')}>{line.hours}</span>
            </span>
            <span className={cn('flex items-center gap-2 whitespace-nowrap text-lg font-bold', dark ? 'text-white' : 'text-[#0b5394]')}>
              {line.phone}
              <Phone className="h-4 w-4" aria-hidden="true" />
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
