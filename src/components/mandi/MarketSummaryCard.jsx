export default function MarketSummaryCard({ selectedDate, currentPrice, forecast, peakPrice, peakDate, pctChange }) {
  const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const forecastStart = new Date(selectedDate);
  const forecastEnd = new Date(forecast[forecast.length - 1]?.date);

  const rows = [
    ["Selected date", fmtDate(selectedDate)],
    ["Current price", `₹${currentPrice.toLocaleString("en-IN")} — Modal Price`],
    ["Forecast period", `${fmtDate(forecastStart)} – ${fmtDate(forecastEnd)}`],
    ["Expected peak", `₹${peakPrice.toLocaleString("en-IN")} — Modal Price`],
    ["Peak date", fmtDate(peakDate)],
    ["Expected change", `${pctChange >= 0 ? "+" : ""}${pctChange}%`],
  ];

  return (
    <div className="card-agri">
      <h3 className="font-bold text-text-main mb-4">Market Summary</h3>
      <div className="space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between text-sm border-b border-border-light pb-2 last:border-0">
            <span className="text-text-subtle">{label}</span>
            <span className="font-semibold text-text-main">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}