import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ChevronRight, Heart, HelpCircle, Menu, Pause, Play, Settings, X } from 'lucide-react';
import { useSession } from '@/lib/authClient';
import { useAccountDialog } from '@/store/accountStore';
import { useIntroStore } from '@/store/introStore';
import { useSoundStore } from '@/store/soundStore';
import SceneBackdrop from './SceneBackdrop';
import { SCENES, type SceneId } from './scenes';

interface PhoneMenuProps {
  onOpenPanel: (panel: 'avatar' | 'feedback') => void;
  scene: SceneId;
  onSceneChange: (scene: SceneId) => void;
}

const row =
  'flex min-h-[56px] w-full items-center gap-3 px-5 py-3 text-left text-white hover:bg-white/5 focus:outline-none focus-visible:bg-white/10';

// Phones keep four tabs; the rest lives here, in a sheet that slides up from the
// bottom. The scene can be changed straight from it, and changes behind the sheet.
export default function PhoneMenu({ onOpenPanel, scene, onSceneChange }: PhoneMenuProps) {
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();
  const { open: openAccount } = useAccountDialog();
  const { open: openIntro } = useIntroStore();
  const { playing, play, stop } = useSoundStore();

  const current = SCENES.find((s) => s.id === scene) ?? SCENES[0];
  const soundOn = playing === current.id;

  const choose = (action: () => void) => {
    setOpen(false);
    action();
  };

  const pickScene = (id: SceneId) => {
    onSceneChange(id);
    // Keep the sound in step with the scene if it's already playing
    if (playing && playing !== 'breathing') play(id);
  };

  const links = [
    { label: 'Settings', detail: 'Account, privacy, safety and display', icon: Settings, action: () => onOpenPanel('avatar') },
    { label: 'Send feedback', detail: 'Tell us what would make Bubble better', icon: Heart, action: () => onOpenPanel('feedback') },
    { label: 'What can Bubble do?', icon: HelpCircle, action: openIntro },
  ];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger
        aria-label="Menu"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white surface-soft surface-soft-hover focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
      >
        <Menu size={20} aria-hidden="true" />
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#06101f]/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-y-auto rounded-t-2xl bg-[#0f2236] pb-[max(env(safe-area-inset-bottom),0.75rem)] text-white shadow-2xl duration-200 focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom motion-reduce:animate-none"
        >
          {/* Grab bar: says "this is a sheet" at a glance */}
          <div className="flex justify-center pt-2.5" aria-hidden="true">
            <span className="h-1 w-10 rounded-full bg-white/30" />
          </div>
          <div className="flex items-center justify-between px-5 pb-2 pt-2">
            <DialogPrimitive.Title className="text-lg font-semibold">Menu</DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close menu"
              className="rounded-full p-2 text-white/80 hover:bg-white/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
            >
              <X size={20} aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="sr-only">
            Your account, scene, settings and feedback
          </DialogPrimitive.Description>

          {/* Account */}
          {session ? (
            <button onClick={() => choose(() => openAccount())} className={row}>
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0b6bb8] text-lg font-semibold"
                aria-hidden="true"
              >
                {session.user.name.trim().charAt(0).toUpperCase() || '?'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{session.user.name}</span>
                <span className="block truncate text-sm text-white/75">{session.user.email}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-white/60" aria-hidden="true" />
            </button>
          ) : (
            <div className="px-5 pb-3 pt-1">
              <p className="mb-3 text-sm text-white/80">Keep a private journal and see how your moods change over time.</p>
              <button
                onClick={() => choose(() => openAccount())}
                className="flex h-12 w-full items-center justify-center rounded-[8px] bg-[#0b6bb8] font-semibold hover:bg-[#095a9c] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
              >
                Sign in or create an account
              </button>
            </div>
          )}

          {/* Scene, changed live behind the sheet */}
          <div className="border-t border-white/10 px-5 py-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-semibold">Scene</h2>
              <button
                onClick={() => (soundOn ? stop() : play(current.id))}
                aria-pressed={soundOn}
                className="flex items-center gap-1.5 rounded-[8px] border border-white/25 px-3 py-1.5 text-sm font-medium hover:bg-white/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
              >
                {soundOn ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
                {soundOn ? 'Pause sound' : 'Play sound'}
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {SCENES.map(({ id, name }) => (
                <button
                  key={id}
                  onClick={() => pickScene(id)}
                  aria-pressed={scene === id}
                  className="group rounded-[8px] text-center focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
                >
                  <span
                    className={`relative mb-1.5 block h-16 overflow-hidden rounded-[8px] ${
                      scene === id ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0f2236]' : 'opacity-80 group-hover:opacity-100'
                    }`}
                  >
                    <SceneBackdrop scene={id} still />
                  </span>
                  <span className={`block truncate text-xs ${scene === id ? 'font-semibold' : 'text-white/80'}`}>{name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Everything else */}
          <ul className="divide-y divide-white/10 border-t border-white/10">
            {links.map(({ label, detail, icon: Icon, action }) => (
              <li key={label}>
                <button onClick={() => choose(action)} className={row}>
                  <Icon className="h-5 w-5 shrink-0 text-[#9fd3f5]" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{label}</span>
                    {detail && <span className="block truncate text-sm text-white/70">{detail}</span>}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-white/60" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
