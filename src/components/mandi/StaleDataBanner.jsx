export default function StaleDataBanner({ message }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
      <span className="text-lg leading-none">⚠️</span>
      <span>{message}</span>
    </div>
  );
}