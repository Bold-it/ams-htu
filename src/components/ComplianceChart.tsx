import {
  PieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { DashboardMetrics } from "@/lib/accreditation-data";

interface ComplianceChartProps {
  metrics: DashboardMetrics;
}

export function ComplianceChart({ metrics }: ComplianceChartProps) {
  const data = [
    { name: "Active", value: metrics.active, fill: "hsl(152, 60%, 42%)" },
    { name: "Warning", value: metrics.warning, fill: "hsl(38, 92%, 50%)" },
    { name: "Critical", value: metrics.critical, fill: "hsl(0, 72%, 51%)" },
    { name: "Expired", value: metrics.expired, fill: "hsl(0, 0%, 45%)" },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-card px-3 py-2 shadow-md">
          <p className="text-sm font-medium">{payload[0].payload.name}</p>
          <p className="text-lg font-bold">{payload[0].value} programmes</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-xl border bg-card p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Compliance Overview</h3>
          <p className="text-sm text-muted-foreground">
            Programme status distribution
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-status-active">
            {metrics.complianceRate}%
          </p>
          <p className="text-xs text-muted-foreground">Compliance Rate</p>
        </div>
      </div>

      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap gap-4">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: item.fill }}
            />
            <span className="text-xs text-muted-foreground">
              {item.name}: <span className="font-medium text-foreground">{item.value}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
