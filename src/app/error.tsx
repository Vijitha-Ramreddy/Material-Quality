"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-500">{error.message || "Unable to load this page."}</p>
        <button
          className="mt-6 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white"
          onClick={reset}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
