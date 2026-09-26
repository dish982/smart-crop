
"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceDot, Legend,
} from "recharts";

export default function PriceForecastChart({ actualHistory, currentPrice, currentDate,forecast }) {
  const fmt = (d) =>
    new Date(d).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
    });

  const actualPoints = actualHistory.map((h) => ({
    date: h.date,
    label: fmt(h.date),
    actual: h.price,
    predicted: null,
  }));

  // Bridge today's actual price to the future prediction line
  const todayStr = currentDate;

  const bridgePoint = {
    date: todayStr,
    label: fmt(todayStr),
    actual: currentPrice,
    predicted: currentPrice,
  };

  const predictedPoints = forecast.map((f) => ({
    date: f.date,
    label: fmt(f.date),
    actual: null,
    predicted: f.predicted_price,
  }));

  const data = [...actualPoints, bridgePoint, ...predictedPoints];

  const peak = forecast.length
    ? forecast.reduce((max, f) =>
        f.predicted_price > max.predicted_price ? f : max
      )
    : null;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={data}
        margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="#E5DEC3"
        />

        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: "#636B62" }}
          axisLine={false}
          tickLine={false}
        />

        <YAxis
          tick={{ fontSize: 12, fill: "#636B62" }}
          axisLine={false}
          tickLine={false}
          label={{
            value: "Modal Price (₹)",
            angle: -90,
            position: "insideLeft",
            fill: "#636B62",
            fontSize: 12,
          }}
        />

        <Tooltip
          formatter={(value, name) => {
            const labels = {
              actual: "Actual price",
              predicted: "Predicted price",
            };

            return [`₹${value}`, labels[name] || name];
          }}
          contentStyle={{
            borderRadius: 10,
            border: "1px solid #E5DEC3",
          }}
        />

        <Legend
          formatter={(value) =>
            ({
              actual: "Actual price",
              predicted: "Predicted price",
            }[value] || value)
          }
          wrapperStyle={{ fontSize: 12 }}
        />

        <Line
          type="monotone"
          dataKey="actual"
          stroke="#2D5A27"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "#2D5A27" }}
          connectNulls
        />

        <Line
          type="monotone"
          dataKey="predicted"
          stroke="#8B9E5A"
          strokeWidth={2.5}
          strokeDasharray="6 4"
          dot={{ r: 3, fill: "#8B9E5A" }}
          connectNulls
        />

        {peak && (
          <ReferenceDot
            x={fmt(peak.date)}
            y={peak.predicted_price}
            r={6}
            fill="#7A1734"
            stroke="white"
            strokeWidth={2}
            label={{
              value: `Peak ₹${peak.predicted_price}`,
              position: "top",
              fontSize: 11,
              fill: "#7A1734",
              fontWeight: 600,
            }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

