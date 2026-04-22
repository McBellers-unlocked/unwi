"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Row {
  segment: string;
  label: string;
  primary: number;
  comparator: number;
  deltaPp: number;
}

function deltaLabel(v: number): string {
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}pp`;
}

export function ComparatorBar({ data }: { data: Row[] }) {
  return (
    <div className="w-full h-[420px]">
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 80, bottom: 8, left: 8 }}
        >
          <CartesianGrid strokeDasharray="2 4" stroke="#e5e7eb" horizontal={false} />
          <XAxis type="number" stroke="#5A6C7D" fontSize={11} />
          <YAxis
            type="category"
            dataKey="label"
            width={180}
            stroke="#5A6C7D"
            fontSize={12}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 6 }}
            formatter={(v: number) => `${v.toFixed(2)}%`}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="comparator" fill="#5A6C7D" name="Q4 2025" />
          <Bar dataKey="primary" fill="#4DAFA8" name="Q1 2026">
            <LabelList
              dataKey="deltaPp"
              position="right"
              formatter={deltaLabel}
              style={{ fontSize: 11, fill: "#0F2540" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
