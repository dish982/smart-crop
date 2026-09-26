import { TrendingUp, TrendingDown } from "lucide-react";

export default function PriceHeader({ crop, mandi, state, selectedDate, priceOnSelectedDate, previousPrice, currentPrice, peakPrice }) {
  const fmtDate = (d) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  const todayChangePct = previousPrice ? (((currentPrice - previousPrice) / previousPrice) * 100).toFixed(1) : null;
  const peakChangePct = (((peakPrice - currentPrice) / currentPrice) * 100).toFixed(1);

  return (
    <div className="card-agri">
      <h1 className="text-2xl font-bold text-text-main">{crop}</h1>
      <p className="text-sm text-text-subtle">{mandi} Mandi, {state}</p>

      <div className="mt-4">
        <p className="text-xs text-text-subtle">latest price of the crop</p>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-primary-green">₹{priceOnSelectedDate.toLocaleString("en-IN")}</span>
          <span className="text-sm text-text-subtle">Modal Price</span>
        </div>
        <p className="text-xs text-text-subtle mt-1">{fmtDate(selectedDate)}</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border-light">
        <div>
          <p className="text-xs text-text-subtle">Previous price</p>
          <p className="text-lg font-bold text-text-main">
            {previousPrice ? `₹${previousPrice.toLocaleString("en-IN")}` : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-subtle">Latest Available price</p>
          <p className="text-lg font-bold text-text-main">₹{currentPrice.toLocaleString("en-IN")}</p>
          {todayChangePct !== null && (
            <p className={`text-xs flex items-center gap-0.5 ${todayChangePct >= 0 ? "text-primary-green" : "text-accent-cherry"}`}>
              {todayChangePct >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {todayChangePct}%
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-text-subtle">Expected peak</p>
          <p className="text-lg font-bold text-text-main">₹{peakPrice.toLocaleString("en-IN")}</p>
          <p className={`text-xs flex items-center gap-0.5 ${peakChangePct >= 0 ? "text-primary-green" : "text-accent-cherry"}`}>
            {peakChangePct >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {peakChangePct}%
          </p>
        </div>
      </div>
    </div>
  );
}