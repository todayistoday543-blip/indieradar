export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 border-3 border-[var(--ink-2)] border-t-[var(--signal-gold)] rounded-full animate-spin" />
      </div>
    </div>
  );
}
