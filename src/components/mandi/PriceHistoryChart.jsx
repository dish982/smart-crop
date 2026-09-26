"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function PriceHistoryChart({ crop, mandi, state }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ state, commodity: crop, market: mandi });
    fetch(`/api/price-check/history?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => setData(json.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [crop, mandi, state]);

  if (loading) return <div className="text-sm text-text-subtle">Loading price history…</div>;
  if (!data?.length) return <div className="text-sm text-text-subtle">No live history available for this market right now.</div>;

  const chartData = data.map((d) => ({
    label: new Date(d.arrival_date || d.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
    price: d.modal_price ?? d.avg_modal_price,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5DEC3" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#636B62" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#636B62" }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v) => [`₹${v}`, "Modal price"]} contentStyle={{ borderRadius: 10, border: "1px solid #E5DEC3" }} />
        <Line type="monotone" dataKey="price" stroke="#2D5A27" strokeWidth={2} dot={{ r: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}