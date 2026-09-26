import { Wheat, CheckCircle2 } from "lucide-react";

export default function RecommendationCard({ decision, currentPrice, peakPrice, peakDate, forecast, trend ,shelfLifeDays,
  daysUntilPeak,
  shelfLifeWarning,}) {
  const isWait = decision === "WAIT";
  const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long" });
  const daysToPeak = Math.max(1, Math.round((new Date(peakDate) - new Date()) / 86400000));
  const pctChange = (((peakPrice - currentPrice) / currentPrice) * 100).toFixed(1);
  const price7Day = forecast[6]?.predicted_price ?? forecast[forecast.length - 1]?.predicted_price;

  const reasons = isWait
    ? [
        `📈 Prices are showing an upward trend.`,
        `₹${currentPrice.toLocaleString("en-IN")} → expected ₹${peakPrice.toLocaleString("en-IN")} (Modal Price).`,
        `Highest predicted price is expected in ~${daysToPeak} day${daysToPeak > 1 ? "s" : ""}.`,
        `Forecasted increase: ${pctChange}%.`,
      ]
    : [
        `📉 Prices are ${trend === "decreasing" ? "expected to decline" : "not expected to rise significantly"}.`,
        `Current price is close to or higher than most upcoming predictions.`,
        `No significant increase is predicted within the forecast period.`,
      ];

  return (
    <div className={`rounded-xl p-6 border-2 ${isWait ? "border-primary-green bg-primary-green/5" : "border-accent-cherry bg-accent-cherry/5"}`}>
      <div className="flex items-center gap-2 mb-4">
        <Wheat className="w-5 h-5 text-text-main" />
        <span className="text-xs font-bold uppercase tracking-wide text-text-subtle">Selling Recommendation</span>
      </div>

      <h2 className={`text-3xl font-bold mb-3 ${isWait ? "text-primary-green" : "text-accent-cherry"}`}>
        {isWait ? "WAIT" : "SELL NOW"}
      </h2>

      <p className="text-sm text-text-main mb-5">
        {isWait
          ? "Prices are expected to increase over the next few days."
          : "Prices are not expected to increase significantly in the forecast period."}
      </p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {isWait ? (
          <>
            <div>
              <p className="text-xs text-text-subtle">Expected peak price</p>
              <p className="font-bold text-text-main">₹{peakPrice.toLocaleString("en-IN")}</p>
            </div>
            <div>
              <p className="text-xs text-text-subtle">Recommended selling time</p>
              <p className="font-bold text-text-main">In ~{daysToPeak} day{daysToPeak > 1 ? "s" : ""}</p>
            </div>
            <div>
              <p className="text-xs text-text-subtle">Potential increase</p>
              <p className="font-bold text-primary-green">+₹{(peakPrice - currentPrice).toFixed(0)}</p>
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="text-xs text-text-subtle">Current price</p>
              <p className="font-bold text-text-main">₹{currentPrice.toLocaleString("en-IN")}</p>
            </div>
            <div>
              <p className="text-xs text-text-subtle">Expected price in 7 days</p>
              <p className="font-bold text-text-main">₹{price7Day?.toLocaleString("en-IN")}</p>
            </div>
          </>
        )}
      </div>

      <div className="pt-4 border-t border-border-light">
        <p className="text-sm font-semibold text-text-main mb-2">
          {isWait ? "Why wait?" : "Why sell now?"}
        </p>
        <ul className="space-y-1.5">
          {reasons.map((r, i) => (
            <li key={i} className="text-sm text-text-subtle flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary-green shrink-0 mt-0.5" />
              {r}
            </li>
          ))}
        </ul>
      </div>

            {shelfLifeWarning && (
        <div className="mt-5 rounded-lg border border-accent-cherry/30 bg-accent-cherry/5 p-4">
          <p className="text-sm font-semibold text-accent-cherry mb-1">
            ⚠️ Shelf-life warning
          </p>

          <p className="text-sm text-text-subtle">
            {shelfLifeWarning}
          </p>

          <p className="text-xs text-text-subtle mt-2">
            Typical shelf life: {shelfLifeDays} day{shelfLifeDays > 1 ? "s" : ""}{" "}
            • Expected peak: in ~{daysUntilPeak} day{daysUntilPeak > 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}