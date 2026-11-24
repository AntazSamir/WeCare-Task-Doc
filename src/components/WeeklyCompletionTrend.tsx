import React, { useMemo } from 'react';
import { CalendarPlus } from 'lucide-react';
import { MixChart, type MixPoint, type MixRange, type MixSeries } from '@/components/mix-chart';
import { Task } from '../types/task';
import { addDaysToIsoDate, getLocalTodayIso } from '../utils/dateUtils';
import { MotionButton } from './ui/MotionButton';

interface WeeklyCompletionTrendProps {
  tasks: Task[];
  onOpenDayTasks?: (dateIso: string) => void;
}

const TASK_SERIES: MixSeries[] = [
  { key: 'completed', label: 'Completed', color: '#16A34A' },
  { key: 'pending', label: 'Pending', color: '#1E40AF' },
  { key: 'overdue', label: 'Overdue', color: '#DC2626' },
];

export const WeeklyCompletionTrend: React.FC<WeeklyCompletionTrendProps> = ({
  tasks,
  onOpenDayTasks,
}) => {
  const todayIso = getLocalTodayIso();

  const { ranges, quickDays } = useMemo(() => {
    const getDayValues = (dateIso: string): [number, number, number] => {
      let completed = 0;
      let pending = 0;
      let overdue = 0;

      for (const t of tasks) {
        if (t.status === 'Completed') {
          const doneDate = t.completedAt ? t.completedAt.slice(0, 10) : t.taskDate;
          if (doneDate === dateIso) {
            completed += 1;
          }
        } else if (t.status === 'Pending' && t.taskDate === dateIso) {
          const isOverdue = t.deadline ? t.deadline < todayIso : t.taskDate < todayIso;
          if (isOverdue) {
            overdue += 1;
          } else {
            pending += 1;
          }
        }
      }

      return [completed, pending, overdue];
    };

    const formatShortDate = (dateIso: string) => {
      const [y, m, d] = dateIso.split('-').map(Number);
      const dt = new Date(y, (m || 1) - 1, d || 1);
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const toPoint = (dateIso: string): MixPoint => {
      const [y, m, d] = dateIso.split('-').map(Number);
      const dt = new Date(y, (m || 1) - 1, d || 1);
      const label = dt.toLocaleDateString('en-US', { weekday: 'short' });
      const fullDate = dt.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      return {
        label,
        detail: dateIso === todayIso ? `${fullDate} (Today)` : fullDate,
        values: getDayValues(dateIso),
      };
    };

    const sumCompleted = (dateList: string[]) =>
      dateList.reduce((acc, iso) => acc + getDayValues(iso)[0], 0);

    const calcPctChange = (current: number, previous: number): number | undefined => {
      if (previous <= 0) {
        return current > 0 ? 100 : undefined;
      }
      return Math.round(((current - previous) / previous) * 1000) / 10;
    };

    // 1. Trailing 7 days (past 6 days + today)
    const trailing7Dates: string[] = [];
    const prevTrailing7Dates: string[] = [];
    for (let i = -6; i <= 0; i++) {
      trailing7Dates.push(addDaysToIsoDate(todayIso, i));
      prevTrailing7Dates.push(addDaysToIsoDate(todayIso, i - 7));
    }
    const trailing7Points = trailing7Dates.map(toPoint);
    const trailing7Change = calcPctChange(
      sumCompleted(trailing7Dates),
      sumCompleted(prevTrailing7Dates)
    );

    // 2. Current Mon-Sun week
    const [ty, tm, td] = todayIso.split('-').map(Number);
    const currDate = new Date(ty, (tm || 1) - 1, td || 1);
    const dow = currDate.getDay();
    const distToMon = dow === 0 ? -6 : 1 - dow;
    const weekDates: string[] = [];
    const prevWeekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      weekDates.push(addDaysToIsoDate(todayIso, distToMon + i));
      prevWeekDates.push(addDaysToIsoDate(todayIso, distToMon + i - 7));
    }
    const weekPoints = weekDates.map(toPoint);
    const weekChange = calcPctChange(sumCompleted(weekDates), sumCompleted(prevWeekDates));

    // 3. Last 4 weeks (4 weekly bars ending today)
    const fourWeekPoints: MixPoint[] = [];
    const fourWeekCompletedCounts: number[] = [];
    for (let w = 3; w >= 0; w--) {
      const endOffset = -w * 7;
      const startOffset = endOffset - 6;
      let c = 0;
      let p = 0;
      let o = 0;
      for (let d = startOffset; d <= endOffset; d++) {
        const [dc, dp, do_] = getDayValues(addDaysToIsoDate(todayIso, d));
        c += dc;
        p += dp;
        o += do_;
      }
      const startIso = addDaysToIsoDate(todayIso, startOffset);
      const endIso = addDaysToIsoDate(todayIso, endOffset);
      fourWeekCompletedCounts.push(c);
      fourWeekPoints.push({
        label: `W${4 - w}`,
        detail: `${formatShortDate(startIso)} – ${formatShortDate(endIso)}`,
        values: [c, p, o],
      });
    }
    const recentTwoWeeks = fourWeekCompletedCounts[2] + fourWeekCompletedCounts[3];
    const priorTwoWeeks = fourWeekCompletedCounts[0] + fourWeekCompletedCounts[1];
    const fourWeekChange = calcPctChange(recentTwoWeeks, priorTwoWeeks);

    const builtRanges: MixRange[] = [
      {
        id: 'trailing7',
        label: 'Past 7 Days',
        points: trailing7Points,
        change: trailing7Change,
        caption: 'tasks tracked over the past 7 days',
      },
      {
        id: 'currentWeek',
        label: 'Mon – Sun',
        points: weekPoints,
        change: weekChange,
        caption: 'tasks scheduled & completed this week',
      },
      {
        id: 'fourWeeks',
        label: '4 Weeks',
        points: fourWeekPoints,
        change: fourWeekChange,
        caption: 'tasks across the last 4 weeks',
      },
    ];

    const quickDayLinks = trailing7Dates.map((dateIso) => {
      const [y, m, d] = dateIso.split('-').map(Number);
      const dt = new Date(y, (m || 1) - 1, d || 1);
      return {
        dateIso,
        dayLabel: dt.toLocaleDateString('en-US', { weekday: 'short' }),
        isToday: dateIso === todayIso,
      };
    });

    return { ranges: builtRanges, quickDays: quickDayLinks };
  }, [tasks, todayIso]);

  return (
    <div className="space-y-2">
      <MixChart
        title="Weekly Task Completion Trend"
        series={TASK_SERIES}
        ranges={ranges}
        unit="tasks"
        decimals={0}
        className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#FFFFFF] dark:bg-[#1C1C1E] text-[#0F172A] dark:text-[#ECECEE] shadow-xs dark:shadow-none"
      />

      {onOpenDayTasks && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-[#64748B] dark:text-[#9A9AA2]">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <CalendarPlus className="w-3.5 h-3.5 text-[#1E40AF] dark:text-[#4C8DF6]" />
            Quick schedule by day:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {quickDays.map((d) => (
              <MotionButton
                key={d.dateIso}
                type="button"
                onClick={() => onOpenDayTasks(d.dateIso)}
                className={`px-2 py-0.5 rounded-md text-[11px] tabular-nums transition-colors whitespace-nowrap shrink-0 ${
                  d.isToday
                    ? 'font-semibold text-[#1E40AF] dark:text-[#4C8DF6] hover:bg-[#EFF6FF] dark:hover:bg-[rgba(76,141,246,0.14)]'
                    : 'hover:text-[#0F172A] dark:hover:text-[#ECECEE] hover:bg-slate-100 dark:hover:bg-[#252528]'
                }`}
                title={`Create task for ${d.dateIso}`}
              >
                {d.isToday ? `${d.dayLabel} (Today)` : d.dayLabel}
              </MotionButton>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
