import { useState } from 'react';
import { ChevronRight, Heart, HelpCircle, LogIn, Menu, Settings, UserRound } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSession } from '@/lib/authClient';
import { useAccountDialog } from '@/store/accountStore';
import { useIntroStore } from '@/store/introStore';

interface PhoneMenuProps {
  onOpenPanel: (panel: 'avatar' | 'feedback') => void;
}

// Phones keep four tabs; the rest lives here, behind one button in the header
export default function PhoneMenu({ onOpenPanel }: PhoneMenuProps) {
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();
  const { open: openAccount } = useAccountDialog();
  const { open: openIntro } = useIntroStore();

  const choose = (action: () => void) => {
    setOpen(false);
    action();
  };

  const items = [
    session
      ? { label: 'Your account', detail: session.user.name, icon: UserRound, action: openAccount }
      : { label: 'Sign in or create an account', detail: 'To keep a journal and mood history', icon: LogIn, action: openAccount },
    { label: 'Settings', detail: 'Scene, sound and display', icon: Settings, action: () => onOpenPanel('avatar') },
    { label: 'Send feedback', icon: Heart, action: () => onOpenPanel('feedback') },
    { label: 'What can Bubble do?', icon: HelpCircle, action: openIntro },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label="Menu"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white surface-soft surface-soft-hover focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
      >
        <Menu size={20} aria-hidden="true" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-[8px] border-0 bg-white p-0 text-gray-900 sm:rounded-[8px]">
          <DialogHeader className="px-5 pb-1 pt-5 text-left">
            <DialogTitle className="text-lg font-bold">Menu</DialogTitle>
            <DialogDescription className="sr-only">Account, settings and feedback</DialogDescription>
          </DialogHeader>
          <ul className="divide-y divide-gray-200 pb-2">
            {items.map(({ label, detail, icon: Icon, action }) => (
              <li key={label}>
                <button
                  onClick={() => choose(action)}
                  className="flex min-h-[56px] w-full items-center gap-3 px-5 py-3 text-left hover:bg-gray-50 focus:outline-none focus-visible:bg-gray-100"
                >
                  <Icon className="h-5 w-5 shrink-0 text-[#0b5394]" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{label}</span>
                    {detail && <span className="block truncate text-sm text-gray-600">{detail}</span>}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
