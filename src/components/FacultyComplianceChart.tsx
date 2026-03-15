import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";
import { Accreditation } from "@/lib/accreditation-data";
import { useMemo } from "react";

interface FacultyComplianceChartProps {
    accreditations: Accreditation[];
}

export function FacultyComplianceChart({ accreditations }: FacultyComplianceChartProps) {
    const data = useMemo(() => {
        const faculties: Record<string, { total: number; active: number }> = {};

        accreditations.forEach((acc) => {
            const faculty = acc.faculty || "Unassigned";
            if (!faculties[faculty]) {
                faculties[faculty] = { total: 0, active: 0 };
            }
            faculties[faculty].total++;
            if (acc.status === "active") {
                faculties[faculty].active++;
            }
        });

        return Object.entries(faculties)
            .map(([name, stats]) => ({
                name,
                complianceRate: Math.round((stats.active / stats.total) * 100),
                total: stats.total,
            }))
            .sort((a, b) => b.complianceRate - a.complianceRate);
    }, [accreditations]);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="rounded-lg border bg-card px-3 py-2 shadow-md">
                    <p className="text-sm font-bold text-foreground">{payload[0].payload.name}</p>
                    <p className="text-sm text-status-active">{payload[0].value}% Compliance</p>
                    <p className="text-xs text-muted-foreground">{payload[0].payload.total} Programmes</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="rounded-xl border bg-card p-6 shadow-card">
            <div className="mb-6">
                <h3 className="text-base font-semibold">Faculty Compliance</h3>
                <p className="text-sm text-muted-foreground">
                    Compliance rate by Academic Faculty
                </p>
            </div>

            <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                        <XAxis type="number" hide domain={[0, 100]} />
                        <YAxis
                            dataKey="name"
                            type="category"
                            tick={{ fontSize: 11, fill: "hsl(215, 15%, 45%)" }}
                            width={80}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
                        <Bar
                            dataKey="complianceRate"
                            radius={[0, 4, 4, 0]}
                            barSize={20}
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.complianceRate > 80 ? "hsl(152, 60%, 42%)" : entry.complianceRate > 50 ? "hsl(38, 92%, 50%)" : "hsl(0, 72%, 51%)"}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
