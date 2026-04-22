"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Row {
  segment: string;
  label: string;
  roles: number;
  orgs: number;
}

export function SegmentRolesBar({ data }: { data: Row[] }) {
  return (
    <div className="w-full h-[380px]">
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 24, bottom: 8, left: 8 }}
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
            formatter={(v: number, name: string) =>
              name === "roles" ? [`${v} roles`, "Roles"] : [`${v} orgs`, "Organisations"]
            }
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="roles" fill="#0F2540" name="Roles" />
          <Bar dataKey="orgs" fill="#4DAFA8" name="Organisations" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
