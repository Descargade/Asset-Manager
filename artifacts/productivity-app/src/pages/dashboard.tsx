import { format, parseISO } from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  TrendingUp,
  ListTodo,
  Activity,
} from "lucide-react";
import {
  useGetDashboardSummary,
  useGetProductivityStats,
  useGetPriorityBreakdown,
  useGetStatusBreakdown,
  useListActivity,
} from "@workspace/api-client-react";

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#6366f1",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#6366f1",
  in_progress: "#f97316",
  completed: "#22c55e",
};

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center"
          style={{ backgroundColor: accent ? `${accent}22` : undefined }}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { data: summary } = useGetDashboardSummary();
  const { data: productivity } = useGetProductivityStats();
  const { data: priorityBreakdown } = useGetPriorityBreakdown();
  const { data: statusBreakdown } = useGetStatusBreakdown();
  const { data: activity } = useListActivity({ limit: 10 });

  const chartData = (productivity ?? []).map((d) => ({
    ...d,
    date: format(parseISO(d.date), "MMM d"),
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {format(new Date(), "EEEE, MMMM d")}
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        <StatCard
          label="Total Tasks"
          value={summary?.totalTasks ?? 0}
          icon={ListTodo}
          accent="#6366f1"
        />
        <StatCard
          label="Done Today"
          value={summary?.completedToday ?? 0}
          icon={CheckCircle2}
          accent="#22c55e"
          sub="completed tasks"
        />
        <StatCard
          label="In Progress"
          value={summary?.inProgress ?? 0}
          icon={Clock}
          accent="#f97316"
        />
        <StatCard
          label="Overdue"
          value={summary?.overdue ?? 0}
          icon={AlertTriangle}
          accent="#ef4444"
        />
        <StatCard
          label="Completion"
          value={`${Math.round(summary?.completionRate ?? 0)}%`}
          icon={TrendingUp}
          accent="#6366f1"
        />
        <StatCard
          label="Streak"
          value={`${summary?.streakDays ?? 0}d`}
          icon={Flame}
          accent="#f59e0b"
          sub="active days"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Productivity over time */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5">
          <h2 className="text-sm font-semibold mb-4">Productivity (14 days)</h2>
          {chartData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
              No data yet. Start completing tasks to see your chart.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="#6366f1"
                  fill="url(#gradCompleted)"
                  strokeWidth={2}
                  name="Completed"
                />
                <Area
                  type="monotone"
                  dataKey="created"
                  stroke="#f97316"
                  fill="url(#gradCreated)"
                  strokeWidth={2}
                  name="Created"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Priority breakdown */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-sm font-semibold mb-4">By Priority</h2>
          {!priorityBreakdown || priorityBreakdown.every((p) => p.count === 0) ? (
            <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
              No tasks yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={priorityBreakdown.filter((p) => p.count > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  dataKey="count"
                  nameKey="priority"
                >
                  {priorityBreakdown.map((entry) => (
                    <Cell
                      key={entry.priority}
                      fill={PRIORITY_COLORS[entry.priority] ?? "#888"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: 12,
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Status breakdown + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-sm font-semibold mb-4">By Status</h2>
          {!statusBreakdown || statusBreakdown.every((s) => s.count === 0) ? (
            <div className="h-24 flex items-center justify-center text-sm text-muted-foreground">
              No tasks yet
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {statusBreakdown.map((s) => {
                const total = statusBreakdown.reduce((a, b) => a + b.count, 0);
                const pct = total > 0 ? (s.count / total) * 100 : 0;
                return (
                  <div key={s.status}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="capitalize text-muted-foreground">
                        {s.status.replace("_", " ")}
                      </span>
                      <span className="font-medium">{s.count}</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: STATUS_COLORS[s.status] ?? "#888",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity feed */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Recent Activity</h2>
          </div>
          {!activity || activity.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              No activity recorded yet.
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {activity.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-foreground capitalize">
                      {entry.action.replace(/_/g, " ")} {entry.entityType}
                    </span>
                    {entry.metadata &&
                      typeof entry.metadata === "object" &&
                      "title" in entry.metadata && (
                        <span className="text-muted-foreground ml-1">
                          &ldquo;{String(entry.metadata.title)}&rdquo;
                        </span>
                      )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {format(parseISO(entry.createdAt), "h:mm a")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
