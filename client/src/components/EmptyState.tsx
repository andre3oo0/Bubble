import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

// What goes here, why it's empty, and what to do next
export default function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="px-4 py-12 text-center text-white">
      {Icon && <Icon className="mx-auto mb-3 h-8 w-8 text-white/80" aria-hidden="true" />}
      <p className="text-lg font-semibold">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-sm text-white/85">{children}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
