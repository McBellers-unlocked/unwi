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
  staff: number;
  consultant: number;
  total: number;
  consultantPct: number;
}

export function StaffVsConsultantBar({ data }: { data: Row[] }) {
  return (
    <div className="w-full h-[380px]">
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
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="staff" stackId="a" fill="#0F2540" name="Staff" />
          <Bar dataKey="consultant" stackId="a" fill="#4DAFA8" name="Consultant">
            <LabelList
              dataKey="consultantPct"
              position="right"
              formatter={(v: number) => `${v.toFixed(0)}% cons.`}
              style={{ fontSize: 11, fill: "#0F2540" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
