import { Link } from "wouter";
import { Phone } from "lucide-react";
import { HELPLINES } from "@shared/safety";

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
          className="mt-5 inline-flex h-11 items-center rounded-[8px] bg-[#0b5394] px-4 font-semibold text-white hover:bg-[#0b3d66] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0b5394]/40"
        >
          Back to Bubble
        </Link>

        {/* Help stays one tap away, even on a wrong link */}
        <h2 className="mt-8 border-t border-gray-200 pt-5 text-sm font-semibold text-gray-900">
          Need to talk to someone now?
        </h2>
        <ul className="divide-y divide-gray-200">
          {HELPLINES.map((line) => (
            <li key={line.phone}>
              <a
                href={`tel:${line.phone.replace(/\s/g, "")}`}
                className="flex items-center gap-3 py-3 text-gray-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0b5394]/40"
              >
                <Phone className="h-4 w-4 shrink-0 text-[#0b5394]" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{line.name}</span>
                  <span className="block text-xs text-gray-600">{line.hours}</span>
                </span>
                <span className="whitespace-nowrap font-bold text-[#0b5394]">{line.phone}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
