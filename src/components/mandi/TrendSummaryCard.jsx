import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function TrendSummaryCard({ trend, currentPrice, forecast }) {
  const next7 = forecast.slice(0, 7);
  const totalChange = next7.length ? next7[next7.length - 1].predicted_price - currentPrice : 0;
  const avgChangePerDay = next7.length ? totalChange / next7.length : 0;
  const pctChange = currentPrice ? ((totalChange / currentPrice) * 100).toFixed(1) : 0;

  const config = {
    increasing: { icon: TrendingUp, label: "Increasing", color: "text-primary-green", bg: "bg-primary-green/10" },
    decreasing: { icon: TrendingDown, label: "Decreasing", color: "text-accent-cherry", bg: "bg-accent-cherry/10" },
    stable: { icon: Minus, label: "Stable", color: "text-text-subtle", bg: "bg-surface-muted" },
  }[trend] || { icon: Minus, label: "Stable", color: "text-text-subtle", bg: "bg-surface-muted" };

  const Icon = config.icon;

  return (
    <div className="card-agri">
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${config.color}`} />
        </span>
        <h3 className="font-bold text-text-main">Price Trend</h3>
      </div>

      <p className={`text-lg font-bold ${config.color} mb-3`}>{config.label}</p>

      {trend === "stable" ? (
        <p className="text-sm text-text-subtle">
          Prices are expected to remain within a narrow range over the next 7 days.
        </p>
      ) : (
        <div className="space-y-1.5 text-sm">
          <p className="text-text-subtle">
            Expected average change over the next 7 days:{" "}
            <span className="font-semibold text-text-main">
              {avgChangePerDay >= 0 ? "+" : ""}₹{avgChangePerDay.toFixed(0)} / day
            </span>
          </p>
          <p className="text-text-subtle">
            Expected change from selected date:{" "}
            <span className="font-semibold text-text-main">{pctChange >= 0 ? "+" : ""}{pctChange}%</span>
          </p>
        </div>
      )}
    </div>
  );
}   