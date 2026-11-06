export default function Loading() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50">
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <span className="size-5 animate-spin rounded-full border-2 border-slate-300 border-t-orange-600" />
        Loading application...
      </div>
    </div>
  );
}
