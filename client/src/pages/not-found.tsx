import { Link } from "wouter";

export default function NotFound() {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#1a6fc4] to-[#0b5394] dark:from-[#0b1d3a] dark:to-[#050d1a] p-4"
      style={{ minHeight: "100dvh" }}
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center text-gray-900">
        <h1 className="mb-2 text-2xl font-bold">This page drifted away</h1>
        <p className="mb-5 text-gray-700">We couldn't find what you were looking for.</p>
        <Link href="/" className="inline-block rounded-full bg-[#0b5394] px-6 py-3 font-medium text-white">
          Back to Bubble
        </Link>
      </div>
    </main>
  );
}
