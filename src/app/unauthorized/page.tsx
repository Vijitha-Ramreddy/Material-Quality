import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="max-w-md rounded-xl border bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-orange-600">403</p>
        <h1 className="mt-2 text-2xl font-semibold">Access denied</h1>
        <p className="mt-3 text-sm text-slate-500">
          Your role does not have permission to access this page.
        </p>
        <Link href="/dashboard" className="mt-6 inline-block text-sm font-medium text-orange-600">
          Return to dashboard
        </Link>
      </div>
    </main>
  );
}
