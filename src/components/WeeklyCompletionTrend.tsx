import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  BarChart3,
  Activity,
  Percent,
  CheckCircle2,
  Calendar,
  Trophy,
  TrendingUp,
} from 'lucide-react';
import { Task } from '../types/task';
import { addDaysToIsoDate, getLocalTodayIso } from '../utils/dateUtils';

interface WeeklyCompletionTrendProps {
  tasks: Task[];
  onOpenDayTasks?: (dateIso: string) => void;
}

type TimeframeMode = 'trailing7' | 'currentWeek';
type ChartStyleMode = 'area' | 'bar';

interface DayTrendPoint {
  dateIso: string;
  dayLabel: string;
  fullDateLabel: string;
  completed: number;
  scheduled: number;
  pending: number;
  isToday: boolean;
  rate: number;
}

export const WeeklyCompletionTrend: React.FC<WeeklyCompletionTrendProps> = ({
  tasks,
  onOpenDayTasks,
}) => {
  const todayIso = getLocalTodayIso();
  const [timeframe, setTimeframe] = useState<TimeframeMode>('trailing7');
  const [chartStyle, setChartStyle] = useState<ChartStyleMode>('area');

  // Compute 7 days series based on selected timeframe
  const trendData = useMemo<DayTrendPoint[]>(() => {
    const days: string[] = [];

    if (timeframe === 'trailing7') {
      // Past 6 days + today = 7 days
      for (let i = -6; i <= 0; i++) {
        days.push(addDaysToIsoDate(todayIso, i));
      }
    } else {
      // Current Week (Monday to Sunday)
      const [y, m, d] = todayIso.split('-').map(Number);
      const curr = new Date(y, (m || 1) - 1, d || 1);
      const dayOfWeek = curr.getDay(); // 0 is Sun, 1 is Mon...
      const distanceToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

      for (let i = 0; i < 7; i++) {
        days.push(addDaysToIsoDate(todayIso, distanceToMon + i));
      }
    }

    return days.map((dateIso) => {
      const [y, m, d] = dateIso.split('-').map(Number);
      const dateObj = new Date(y, (m || 1) - 1, d || 1);
      const dayLabel = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const fullDateLabel = dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

      // Tasks completed on this specific day
      const completedOnThisDay = tasks.filter((t) => {
        if (t.status !== 'Completed') return false;
        if (t.completedAt) {
          return t.completedAt.slice(0, 10) === dateIso;
        }
        return t.taskDate === dateIso;
      }).length;

      // Tasks scheduled for this day
      const scheduledOnThisDay = tasks.filter((t) => t.taskDate === dateIso).length;

      // Pending tasks scheduled for this day
      const pendingOnThisDay = tasks.filter(
        (t) => t.status === 'Pending' && t.taskDate === dateIso
      ).length;

      const rate =
        scheduledOnThisDay > 0
          ? Math.round((completedOnThisDay / scheduledOnThisDay) * 100)
          : completedOnThisDay > 0
          ? 100
          : 0;

      return {
        dateIso,
        dayLabel,
        fullDateLabel,
        completed: completedOnThisDay,
        scheduled: scheduledOnThisDay,
        pending: pendingOnThisDay,
        isToday: dateIso === todayIso,
        rate,
      };
    });
  }, [tasks, todayIso, timeframe]);

  // Aggregate Weekly Analytics KPIs
  const analytics = useMemo(() => {
    const totalCompleted = trendData.reduce((sum, d) => sum + d.completed, 0);
    const totalScheduled = trendData.reduce((sum, d) => sum + d.scheduled, 0);

    // Find peak completion day
    let peakDay = trendData[0];
    for (const d of trendData) {
      if (d.completed > peakDay.completed) {
        peakDay = d;
      }
    }

    const overallRate =
      totalScheduled > 0
        ? Math.round((totalCompleted / totalScheduled) * 100)
        : totalCompleted > 0
        ? 100
        : 0;

    const avgDailyCompleted = (totalCompleted / 7).toFixed(1);

    return {
      totalCompleted,
      totalScheduled,
      overallRate,
      avgDailyCompleted,
      peakDay,
    };
  }, [trendData]);

  // Custom Dark/Light Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: DayTrendPoint = payload[0].payload;
      return (
        <div className="bg-[#123B78]/95 dark:bg-slate-800/95 backdrop-blur-md text-white border border-[#36A5F5]/40 dark:border-slate-700/80 rounded-md p-3 shadow-xl text-xs space-y-1.5 min-w-[170px]">
          <div className="font-semibold text-white flex items-center justify-between border-b border-white/15 pb-1">
            <span>{data.fullDateLabel}</span>
            {data.isToday && (
              <span className="text-[10px] font-mono text-[#16A36A] bg-[#16A36A]/15 px-1.5 py-0.2 rounded">
                Today
              </span>
            )}
          </div>
          <div className="space-y-1 pt-0.5">
            <div className="flex items-center justify-between font-mono text-[#16A36A]">
              <span className="flex items-center gap-1.5 text-white/80">
                <span className="w-2 h-2 rounded-full bg-[#16A36A]" />
                Completed:
              </span>
              <span className="font-bold tabular-nums">{data.completed}</span>
            </div>
            <div className="flex items-center justify-between font-mono text-[#36A5F5]">
              <span className="flex items-center gap-1.5 text-white/80">
                <span className="w-2 h-2 rounded-full bg-[#36A5F5]" />
                Scheduled:
              </span>
              <span className="font-bold tabular-nums">{data.scheduled}</span>
            </div>
            {data.pending > 0 && (
              <div className="flex items-center justify-between font-mono text-[#E9A23B]">
                <span className="flex items-center gap-1.5 text-white/80">
                  <span className="w-2 h-2 rounded-full bg-[#E9A23B]" />
                  Pending:
                </span>
                <span className="font-bold tabular-nums">{data.pending}</span>
              </div>
            )}
            <div className="border-t border-white/15 pt-1 flex items-center justify-between text-[11px] font-mono text-white/70">
              <span>Day Velocity:</span>
              <span className="text-white font-semibold">{data.rate}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800/80 rounded-lg overflow-hidden shadow-xs">
      {/* Header with Title & Minimal Segmented Controls */}
      <div className="px-5 py-3.5 border-b border-[#E3EAF3] dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#16A36A]/10 border border-[#16A36A]/30 flex items-center justify-center shrink-0">
            <Percent className="w-4 h-4 text-[#16A36A]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#172B4D] dark:text-slate-100 tracking-tight">
                Weekly Task Completion Trend
              </h2>
              <span className="font-mono text-xs tabular-nums text-[#16A36A] dark:text-emerald-400 bg-[#16A36A]/10 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded font-medium">
                {analytics.totalCompleted} done this week
              </span>
            </div>
            <p className="text-[11px] text-[#172B4D]/65 dark:text-slate-400 mt-0.5">
              Daily velocity and workload delivery curve
            </p>
          </div>
        </div>

        {/* Action Controls: Timeframe & Chart Style Toggles */}
        <div className="flex items-center gap-2">
          {/* Timeframe Selector */}
          <div className="flex items-center gap-1 p-0.5 bg-[#F5F8FC] dark:bg-slate-800 border border-[#E3EAF3] dark:border-slate-700 rounded-md text-[11px]">
            <button
              type="button"
              onClick={() => setTimeframe('trailing7')}
              className={`px-2.5 py-1 font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                timeframe === 'trailing7'
                  ? 'bg-[#FFFFFF] dark:bg-slate-900 text-[#123B78] dark:text-slate-100 shadow-xs'
                  : 'text-[#172B4D]/70 dark:text-slate-400 hover:text-[#123B78] dark:hover:text-slate-200'
              }`}
            >
              Past 7 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('currentWeek')}
              className={`px-2.5 py-1 font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                timeframe === 'currentWeek'
                  ? 'bg-[#FFFFFF] dark:bg-slate-900 text-[#123B78] dark:text-slate-100 shadow-xs'
                  : 'text-[#172B4D]/70 dark:text-slate-400 hover:text-[#123B78] dark:hover:text-slate-200'
              }`}
            >
              Mon – Sun
            </button>
          </div>

          {/* Chart Style Selector */}
          <div className="flex items-center gap-1 p-0.5 bg-[#F5F8FC] dark:bg-slate-800 border border-[#E3EAF3] dark:border-slate-700 rounded-md text-[11px]">
            <button
              type="button"
              onClick={() => setChartStyle('area')}
              title="Area Curve"
              className={`p-1 rounded-md transition-colors ${
                chartStyle === 'area'
                  ? 'bg-[#FFFFFF] dark:bg-slate-900 text-[#123B78] dark:text-slate-100 shadow-xs'
                  : 'text-[#172B4D]/60 hover:text-[#123B78] dark:hover:text-slate-200'
              }`}
              aria-label="Area curve chart"
            >
              <Activity className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setChartStyle('bar')}
              title="Bar Chart"
              className={`p-1 rounded-md transition-colors ${
                chartStyle === 'bar'
                  ? 'bg-[#FFFFFF] dark:bg-slate-900 text-[#123B78] dark:text-slate-100 shadow-xs'
                  : 'text-[#172B4D]/60 hover:text-[#123B78] dark:hover:text-slate-200'
              }`}
              aria-label="Bar comparison chart"
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4-KPI Quick Analytics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#F5F8FC] dark:bg-slate-900/40 border-b border-[#E3EAF3] dark:border-slate-800/80">
        <div className="px-2">
          <div className="text-[11px] font-medium text-[#172B4D]/65 dark:text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#16A36A]" />
            Completed
          </div>
          <div className="mt-1 text-lg font-mono font-bold tabular-nums text-[#16A36A] dark:text-emerald-400">
            {analytics.totalCompleted}{' '}
            <span className="text-xs font-normal text-[#172B4D]/50 dark:text-slate-400">tasks</span>
          </div>
        </div>

        <div className="px-2 border-l border-[#E3EAF3] dark:border-slate-800">
          <div className="text-[11px] font-medium text-[#172B4D]/65 dark:text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#1769E8]" />
            Scheduled
          </div>
          <div className="mt-1 text-lg font-mono font-bold tabular-nums text-[#172B4D] dark:text-slate-200">
            {analytics.totalScheduled}{' '}
            <span className="text-xs font-normal text-[#172B4D]/50 dark:text-slate-400">tasks</span>
          </div>
        </div>

        <div className="px-2 border-l border-[#E3EAF3] dark:border-slate-800">
          <div className="text-[11px] font-medium text-[#172B4D]/65 dark:text-slate-400 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-[#E9A23B]" />
            Peak Day
          </div>
          <div className="mt-1 text-sm font-semibold truncate text-[#172B4D] dark:text-slate-200">
            {analytics.peakDay.completed > 0 ? (
              <span>
                {analytics.peakDay.dayLabel}{' '}
                <span className="text-xs font-mono font-normal text-[#172B4D]/50 dark:text-slate-400">
                  ({analytics.peakDay.completed} done)
                </span>
              </span>
            ) : (
              <span className="text-[#172B4D]/50 dark:text-slate-400 font-normal">None yet</span>
            )}
          </div>
        </div>

        <div className="px-2 border-l border-[#E3EAF3] dark:border-slate-800">
          <div className="text-[11px] font-medium text-[#172B4D]/65 dark:text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#36A5F5]" />
            Daily Avg
          </div>
          <div className="mt-1 text-lg font-mono font-bold tabular-nums text-[#1769E8] dark:text-blue-400">
            {analytics.avgDailyCompleted}{' '}
            <span className="text-xs font-normal text-[#172B4D]/50 dark:text-slate-400">/ day</span>
          </div>
        </div>
      </div>

      {/* Main Recharts Graph Viewport */}
      <div className="p-4 sm:p-5">
        <div className="w-full h-56 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            {chartStyle === 'area' ? (
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--color-border)"
                />

                <XAxis
                  dataKey="dayLabel"
                  stroke="var(--color-border)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  tick={{ fill: 'var(--color-secondary-text)' }}
                />

                <YAxis
                  allowDecimals={false}
                  stroke="var(--color-border)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--color-secondary-text)' }}
                />

                <Tooltip content={<CustomTooltip />} />

                {/* Scheduled Workload Area */}
                <Area
                  type="monotone"
                  dataKey="scheduled"
                  name="Scheduled"
                  stroke="var(--color-primary-blue)"
                  strokeWidth={1.75}
                  strokeDasharray="4 4"
                  fill="var(--color-primary-blue)"
                  fillOpacity={0.1}
                />

                {/* Completed Tasks Primary Area */}
                <Area
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stroke="var(--color-success)"
                  strokeWidth={2.5}
                  fill="var(--color-success)"
                  fillOpacity={0.14}
                  activeDot={{
                    r: 5,
                    stroke: 'var(--color-success)',
                    strokeWidth: 2,
                    fill: 'var(--color-card-bg)',
                  }}
                />
              </AreaChart>
            ) : (
              <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--color-border)"
                />

                <XAxis
                  dataKey="dayLabel"
                  stroke="var(--color-border)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  tick={{ fill: 'var(--color-secondary-text)' }}
                />

                <YAxis
                  allowDecimals={false}
                  stroke="var(--color-border)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--color-secondary-text)' }}
                />

                <Tooltip content={<CustomTooltip />} />

                <Bar
                  dataKey="scheduled"
                  name="Scheduled"
                  fill="var(--color-sky-blue)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="completed"
                  name="Completed"
                  fill="var(--color-success)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Legend & Interactive Day Markers */}
        <div className="mt-3 pt-3 border-t border-[#E3EAF3] dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-[11px] text-[#172B4D]/70 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16A36A]" />
              Completed Tasks
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1769E8]" />
              Scheduled Tasks
            </span>
          </div>

          {/* Quick Clickable Day Pills */}
          <div className="flex items-center gap-1">
            {trendData.map((d) => (
              <button
                key={d.dateIso}
                type="button"
                onClick={() => onOpenDayTasks?.(d.dateIso)}
                title={`${d.fullDateLabel}: ${d.completed} completed, ${d.scheduled} scheduled`}
                className={`px-1.5 py-0.5 text-[10px] font-mono rounded-md transition-colors ${
                  d.isToday
                    ? 'bg-[#1769E8] text-white font-bold'
                    : d.completed > 0
                    ? 'bg-[#16A36A]/10 dark:bg-emerald-950/60 text-[#16A36A] dark:text-emerald-300 hover:bg-[#16A36A]/20'
                    : 'text-[#172B4D]/50 hover:bg-[#DCEBFF]/60 dark:hover:bg-slate-800'
                }`}
              >
                {d.dayLabel}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
