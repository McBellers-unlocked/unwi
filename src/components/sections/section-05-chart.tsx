"use client";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PALETTE = ["#0F2540", "#4DAFA8", "#5A6C7D", "#1c3a63", "#7dc6c0", "#B07D4A"];

export function ConcurrencyChart({
  data,
  series,
}: {
  data: Record<string, number | string>[];
  series: { key: string; label: string }[];
}) {
  return (
    <div className="w-full h-[380px]">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#e5e7eb" />
          <XAxis dataKey="month" stroke="#5A6C7D" fontSize={11} />
          <YAxis stroke="#5A6C7D" fontSize={11} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
