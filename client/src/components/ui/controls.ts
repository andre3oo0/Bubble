import { cn } from '@/lib/utils';

// One set of control styles for the whole app: 8 px corners, one blue for actions,
// red only for destructive ones. "dark" is for the scene, the frosted panels and the
// dark sheets; "light" is for white surfaces (help screen, account dialog).

export type Tone = 'dark' | 'light';
export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger';
export type ButtonSize = 'md' | 'sm';

const base =
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-[8px] font-semibold transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50';

const sizes: Record<ButtonSize, string> = {
  md: 'min-h-11 px-4 text-[15px]',
  sm: 'min-h-9 px-3 text-sm',
};

export const focusRing: Record<Tone, string> = {
  dark: 'focus-visible:ring-4 focus-visible:ring-white/60',
  light: 'focus-visible:ring-4 focus-visible:ring-[#0b6bb8]/40',
};

const variants: Record<Tone, Record<ButtonVariant, string>> = {
  dark: {
    primary: 'bg-[#0b6bb8] text-white enabled:hover:bg-[#095a9c] [&:not(button)]:hover:bg-[#095a9c]',
    secondary: 'border border-white/35 text-white enabled:hover:bg-white/10 [&:not(button)]:hover:bg-white/10',
    tertiary: 'text-white/90 underline-offset-4 enabled:hover:underline [&:not(button)]:hover:underline',
    danger: 'border border-[#ffc9c9]/50 text-[#ffc9c9] enabled:hover:bg-white/10',
  },
  light: {
    primary: 'bg-[#0b6bb8] text-white enabled:hover:bg-[#095a9c] [&:not(button)]:hover:bg-[#095a9c]',
    secondary: 'border border-[#c5d3e0] text-[#0b3d66] enabled:hover:bg-[#f1f5f9] [&:not(button)]:hover:bg-[#f1f5f9]',
    tertiary: 'text-[#0b5394] underline-offset-4 enabled:hover:underline [&:not(button)]:hover:underline',
    danger: 'bg-red-700 text-white enabled:hover:bg-red-800 focus-visible:ring-red-300',
  },
};

export function buttonClass({
  variant = 'primary',
  tone = 'dark',
  size = 'md',
  className,
}: { variant?: ButtonVariant; tone?: Tone; size?: ButtonSize; className?: string } = {}) {
  return cn(base, sizes[size], focusRing[tone], variants[tone][variant], className);
}

// Icon-only buttons: always a 44 px target, and always given an aria-label by the caller
export function iconButtonClass(tone: Tone = 'dark', className?: string) {
  return cn(
    'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] transition-colors focus:outline-none',
    focusRing[tone],
    tone === 'dark' ? 'text-white hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
    className,
  );
}

export const fieldClass: Record<Tone, string> = {
  dark: 'w-full rounded-[8px] border border-white/25 bg-white/10 px-3 py-2.5 text-white placeholder-white/65 focus:border-white/60 focus:outline-none focus:ring-4 focus:ring-white/25 disabled:opacity-60',
  light:
    'w-full rounded-[8px] border border-[#c5d3e0] bg-white px-3 py-2.5 text-gray-900 placeholder-gray-500 focus:border-[#0b6bb8] focus:outline-none focus:ring-4 focus:ring-[#0b6bb8]/25 disabled:opacity-60',
};

export const labelClass: Record<Tone, string> = {
  dark: 'mb-1.5 block text-sm font-medium text-white',
  light: 'mb-1.5 block text-sm font-medium text-gray-800',
};

// Small boxed messages inside forms and dialogs
export const noticeClass = {
  error: 'rounded-[8px] bg-red-50 px-3 py-2 text-sm text-red-800',
  warning: 'rounded-[8px] bg-amber-50 px-3 py-2 text-sm text-amber-900',
  success: 'rounded-[8px] bg-green-50 px-3 py-2 text-sm text-green-900',
};

// Opaque dark dialogs (intro, end of chat, breathing): the same navy as the phone
// menu sheet, so the scene and Bubble's face don't show through as a glow
export const darkSheetClass = 'border border-white/10 bg-[#0f2236] text-white shadow-2xl';

// Selected and unselected chips in a choice group (moods)
export function chipClass(selected: boolean) {
  return cn(
    'inline-flex min-h-10 items-center rounded-[8px] px-3.5 text-sm font-medium transition-colors focus:outline-none',
    focusRing.dark,
    selected ? 'bg-white text-[#0b3d66]' : 'border border-white/25 text-white hover:bg-white/10',
  );
}
