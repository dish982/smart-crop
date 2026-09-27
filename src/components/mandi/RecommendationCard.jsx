import { Wheat, CheckCircle2 } from "lucide-react";

export default function RecommendationCard({
  decision,
  trend,
  currentPrice,
  peakPrice,
  peakDate,
  peakStatus,
  peakMessage,
  shelfLifeDays,
  shelfLifeWarning,
}) {
  const isWait = decision === "WAIT";

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
    });

  return (
    <div
      className={`rounded-xl p-6 border-2 ${
        isWait
          ? "border-primary-green bg-primary-green/5"
          : "border-accent-cherry bg-accent-cherry/5"
      }`}
    >
      <div className="flex items-center gap-2 mb-4">
        <Wheat className="w-5 h-5 text-text-main" />

        <span className="text-xs font-bold uppercase tracking-wide text-text-subtle">
          Selling Recommendation
        </span>
      </div>

      <h2
        className={`text-3xl font-bold mb-3 ${
          isWait ? "text-primary-green" : "text-accent-cherry"
        }`}
      >
        {isWait ? "WAIT" : "SELL NOW"}
      </h2>

      {/* Peak timing / selling explanation */}
      <p className="text-sm text-text-main mb-3">
        {peakMessage}
      </p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-text-subtle">
            Current price
          </p>

          <p className="font-bold text-text-main">
            ₹{currentPrice.toLocaleString("en-IN")}
          </p>
        </div>

        <div>
          <p className="text-xs text-text-subtle">
            {peakStatus === "past"
              ? "Peak price (past)"
              : peakStatus === "today"
                ? "Peak price (today)"
                : "Expected peak price"}
          </p>

          <p className="font-bold text-text-main">
            ₹{peakPrice.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* Shelf-life consideration only for a genuinely upcoming peak */}
      {shelfLifeWarning && peakStatus === "upcoming" && (
        <div className="mt-2 mb-2 pt-4 border-t border-border-light">
          <p className="text-sm font-semibold text-text-main mb-1">
            Shelf life consideration
          </p>

          <p className="text-sm text-text-subtle flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary-green shrink-0 mt-0.5" />

            {shelfLifeWarning}
          </p>

          {shelfLifeDays && (
            <p className="text-xs text-text-subtle mt-1">
              Typical shelf life: {shelfLifeDays} day(s).
            </p>
          )}
        </div>
      )}
    </div>
  );
}