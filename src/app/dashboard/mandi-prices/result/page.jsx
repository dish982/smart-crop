"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PriceHeader from "@/components/mandi/PriceHeader";
import PriceForecastChart from "@/components/mandi/PriceForecastChart";
import TrendSummaryCard from "@/components/mandi/TrendSummaryCard";
import RecommendationCard from "@/components/mandi/RecommendationCard";
import MarketSummaryCard from "@/components/mandi/MarketSummaryCard";
import PriceHistoryChart from "@/components/mandi/PriceHistoryChart";
import MandiComparisonChart from "@/components/mandi/MandiComparisonChart";

export default function ResultPage() {
  const params = useSearchParams();
  const router = useRouter();

  const crop = params.get("crop");
  const mandi = params.get("mandi");
  const state = params.get("state") || "Maharashtra";

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!crop || !mandi) return;

    setLoading(true);

    fetch("/api/price-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crop, state, mandi }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Prediction failed");
        setData(json);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [crop, mandi, state]);

  if (loading) {
    return (
      <div className="p-8 text-center text-text-subtle text-sm">
        Generating advisory…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <div className="card-agri text-accent-cherry text-sm">{error}</div>
        <button
          onClick={() => router.back()}
          className="btn-secondary mt-4"
        >
          Go back
        </button>
      </div>
    );
  }

  if (!data) return null;

  const peakEntry = data.forecast.reduce(
    (max, f) =>
      f.predicted_price > max.predicted_price ? f : max,
    data.forecast[0]
  );

  const currentEntry = {
    predicted_price: data.current_price,
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-2 sm:p-4">
      <button
        onClick={() => router.back()}
        className="text-sm text-text-subtle hover:text-text-main"
      >
        ← Back
      </button>

      <PriceHeader
        crop={crop}
        mandi={mandi}
        state={state}
        selectedDate={data.current_date}
        priceOnSelectedDate={currentEntry.predicted_price}
        previousPrice={data.previous_price}
        currentPrice={data.current_price}
        peakPrice={peakEntry.predicted_price}
      />

      <div className="card-agri">
        <h3 className="font-bold text-text-main mb-1">
          Price Analysis & Prediction
        </h3>

        <p className="text-xs text-text-subtle mb-4">
          Solid = actual · Dashed = predicted
        </p>

        <PriceForecastChart
          actualHistory={data.actual_history || []}
          currentPrice={data.current_price}
          currentDate={data.current_date}
          forecast={data.forecast}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TrendSummaryCard
          trend={data.trend}
          currentPrice={data.current_price}
          forecast={data.forecast}
        />

        <MarketSummaryCard
          selectedDate={data.current_date}
          currentPrice={data.current_price}
          forecast={data.forecast}
          peakPrice={peakEntry.predicted_price}
          peakDate={peakEntry.date}
          pctChange={data.pct_change_vs_current}
        />
      </div>

      <RecommendationCard
        decision={data.decision}
        currentPrice={data.current_price}
        peakPrice={peakEntry.predicted_price}
        peakDate={peakEntry.date}
        forecast={data.forecast}
        trend={data.trend}
        shelfLifeDays={data.shelf_life_days}
        daysUntilPeak={data.days_until_peak}
        shelfLifeWarning={data.shelf_life_warning}
      />

      <div className="card-agri">
        <h3 className="font-bold text-text-main mb-1">
          Price History — {mandi}
        </h3>

        <p className="text-xs text-text-subtle mb-4">
          Live data from Mandi Price API
        </p>

        <PriceHistoryChart
          crop={crop}
          mandi={mandi}
          state={state}
        />
      </div>

      <div className="card-agri">
        <h3 className="font-bold text-text-main mb-1">
          {crop} Prices Across Maharashtra Mandis
        </h3>

        <p className="text-xs text-text-subtle mb-4">
          Comparing the latest available price reported by nearby markets
        </p>

        <MandiComparisonChart
          crop={crop}
          state={state}
          currentMandi={mandi}
        />
      </div>
    </div>
  );
}