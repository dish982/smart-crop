"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import StaleDataBanner from "./StaleDataBanner";

export default function MandiComparisonChart({ crop, state, currentMandi }) {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const normalizeMandi = (name) =>
  name?.trim().replace(/^APMC\s+/i, "").trim().toLowerCase();

  useEffect(() => {
    const params = new URLSearchParams({ state, commodity: crop });
    fetch(`/api/price-check/mandi-comparison?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => setPayload(json))
      .catch(() => setPayload({ data: [] }))
      .finally(() => setLoading(false));
  }, [crop, state]);

  if (loading) return <div className="text-sm text-text-subtle">Loading mandi comparison…</div>;

  const data = payload?.data || [];
  console.log("Selected mandi:", currentMandi);
  console.log("API markets:", data.map((d) => d.market));
  if (!data.length) return <div className="text-sm text-text-subtle">No comparison data available right now.</div>;

  const chartData = data
    .map((d) => ({ market: d.market, price: d.modal_price }))
    .sort((a, b) => b.price - a.price)
    .slice(0, 10);

  return (
    <div className="space-y-3">
      {payload.stale_data && (
        <StaleDataBanner
          message={`Cross-mandi comparison data for ${crop} hasn't updated recently (${payload.days_since_last_record} days since the last record).`}
        />
      )}
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5DEC3" />
          <XAxis dataKey="market" tick={{ fontSize: 10, fill: "#636B62" }} angle={-35} textAnchor="end" interval={0} />
          <YAxis tick={{ fontSize: 11, fill: "#636B62" }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(v) => [`₹${v}`, "Modal price"]} contentStyle={{ borderRadius: 10, border: "1px solid #E5DEC3" }} />
          <Bar dataKey="price" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  normalizeMandi(entry.market) === normalizeMandi(currentMandi)
                    ? "#50858e"
                    : "#8b9e5a"
                }
/>
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}