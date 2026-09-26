"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

export default function MandiComparisonChart({ crop, state, currentMandi }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ state, commodity: crop });
    fetch(`/api/price-check/mandi-comparison?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => setData(json.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [crop, state]);

  if (loading) return <div className="text-sm text-text-subtle">Loading mandi comparison…</div>;
  if (!data?.length) return <div className="text-sm text-text-subtle">No comparison data available right now.</div>;

  const chartData = data
    .map((d) => ({ market: d.market, price: d.modal_price }))
    .sort((a, b) => b.price - a.price)
    .slice(0, 10);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5DEC3" />
        <XAxis dataKey="market" tick={{ fontSize: 10, fill: "#636B62" }} angle={-35} textAnchor="end" interval={0} />
        <YAxis tick={{ fontSize: 11, fill: "#636B62" }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v) => [`₹${v}`, "Modal price"]} contentStyle={{ borderRadius: 10, border: "1px solid #E5DEC3" }} />
        <Bar dataKey="price" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.market === currentMandi ? "#7A1734" : "#8B9E5A"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}