import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { iconButtonClass } from './ui/controls';

interface PageHeaderProps {
  title: string;
  // Shows a back arrow to the left of the title
  onBack?: () => void;
  backLabel?: string;
  // One action on the right, e.g. "New entry"
  action?: ReactNode;
  // Phones already show the page in the selected tab, so Chat hides its title there
  // to give the conversation the room
  hideOnPhone?: boolean;
  // Focus moves to the title when this changes (and on first show), so keyboard and
  // screen reader users start at the top of the new view instead of the page body
  focusKey?: string;
}

export default function PageHeader({ title, onBack, backLabel = 'Back', action, hideOnPhone = false, focusKey }: PageHeaderProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [focusKey]);

  return (
    <div className={cn('mb-4 flex min-h-11 items-center gap-2', hideOnPhone && 'sr-only md:not-sr-only md:flex')}>
      {onBack && (
        <button onClick={onBack} aria-label={backLabel} className={iconButtonClass('dark', '-ml-2')}>
          <ArrowLeft className="h-6 w-6" aria-hidden="true" />
        </button>
      )}
      <h1 ref={headingRef} tabIndex={-1} className="min-w-0 flex-1 truncate text-2xl font-semibold text-white focus:outline-none">
        {title}
      </h1>
      {action}
    </div>
  );
}
