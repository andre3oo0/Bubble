import { Link } from "wouter";
import HelplineList from "@/components/HelplineList";
import { buttonClass } from "@/components/ui/controls";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b2a4a] p-4" style={{ minHeight: "100dvh" }}>
      <div className="w-full max-w-md rounded-[8px] bg-white p-6 text-gray-900 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-600">Error 404</p>
        <h1 className="mt-2 text-2xl font-bold text-[#0b3d66]">This page doesn't exist</h1>
        <p className="mt-2 text-gray-700">
          The link may be old or mistyped. Your journal and settings are where you left them.
        </p>
        <Link
          href="/"
          className={buttonClass({ tone: "light", className: "mt-5" })}
        >
          Back to Bubble
        </Link>

        {/* Help stays one tap away, even on a wrong link */}
        <h2 className="mt-8 border-t border-gray-200 pt-5 text-sm font-semibold text-gray-900">
          Need to talk to someone now?
        </h2>
        <HelplineList className="mt-2" />
      </div>
    </main>
  );
}
