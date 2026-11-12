import React from 'react';

/**
 * Premium Skeleton Loaders for Korea Study Hub PMS
 * Designed to eliminate blank screen flashes and jarring layout shifts
 */

export const SkeletonLine: React.FC<{
  className?: string;
  width?: string;
  height?: string;
}> = ({ className = '', width = 'w-full', height = 'h-4' }) => (
  <div
    className={`rounded skeleton-shimmer bg-[#DCEBFF]/70 dark:bg-slate-800 ${width} ${height} ${className}`}
  />
);

export const SkeletonCard: React.FC<{
  className?: string;
  lines?: number;
}> = ({ className = '', lines = 3 }) => (
  <div
    className={`p-4 rounded-xl bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 shadow-xs space-y-3 ${className}`}
  >
    <div className="flex items-center justify-between">
      <SkeletonLine width="w-1/3" height="h-4" />
      <SkeletonLine width="w-8" height="h-4" />
    </div>
    <SkeletonLine width="w-2/3" height="h-6" />
    <div className="space-y-1.5 pt-1">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine
          key={i}
          width={i === lines - 1 ? 'w-1/2' : 'w-full'}
          height="h-3"
        />
      ))}
    </div>
  </div>
);

export const CardGridSkeleton: React.FC<{
  count?: number;
  columns?: string;
}> = ({ count = 6, columns = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' }) => (
  <div className={`grid gap-4 ${columns} animate-page-enter`}>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className={`animate-card-enter stagger-${Math.min(i + 1, 12)}`}
      >
        <SkeletonCard lines={3} />
      </div>
    ))}
  </div>
);

export const TableSkeleton: React.FC<{
  rows?: number;
  cols?: number;
}> = ({ rows = 5, cols = 5 }) => (
  <div className="w-full bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-xl overflow-hidden animate-page-enter">
    <div className="p-4 border-b border-[#E3EAF3] dark:border-slate-800 flex justify-between items-center">
      <SkeletonLine width="w-48" height="h-5" />
      <SkeletonLine width="w-24" height="h-8" />
    </div>
    <div className="divide-y divide-[#E3EAF3] dark:divide-slate-800">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="p-4 flex items-center gap-4">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <SkeletonLine
              key={cIdx}
              width={cIdx === 0 ? 'w-1/4' : 'w-1/6'}
              height="h-3.5"
            />
          ))}
        </div>
      ))}
    </div>
  </div>
);

/**
 * Realistic University Details Page Skeleton
 * Matches the reference design structure:
 * - Back button & status badge
 * - Institutional Hero Card with crest & banner
 * - Tab navigation strip
 * - 3-column top grid (Intake, Programs, Refund Policy)
 * - 3-column bottom grid (Bank, Dates, Documents)
 */
export const UniversityDetailsSkeleton: React.FC = () => {
  return (
    <div className="space-y-5 animate-page-enter">
      {/* Top Breadcrumb & Return Action */}
      <div className="flex items-center justify-between">
        <SkeletonLine width="w-36" height="h-8" className="rounded-lg" />
        <SkeletonLine width="w-24" height="h-8" className="rounded-full" />
      </div>

      {/* Hero Banner Skeleton */}
      <div className="rounded-2xl border border-[#E3EAF3] dark:border-slate-800 bg-[#FFFFFF] dark:bg-slate-900 p-6 shadow-xs flex flex-col md:flex-row items-center gap-6">
        <div className="w-24 h-24 rounded-2xl skeleton-shimmer bg-[#DCEBFF]/70 dark:bg-slate-800 shrink-0" />
        <div className="flex-1 space-y-3 w-full">
          <SkeletonLine width="w-64" height="h-7" />
          <div className="flex flex-wrap gap-4 pt-1">
            <SkeletonLine width="w-28" height="h-4" />
            <SkeletonLine width="w-32" height="h-4" />
            <SkeletonLine width="w-24" height="h-4" />
          </div>
        </div>
        <div className="hidden lg:block w-72 h-24 rounded-xl skeleton-shimmer bg-[#DCEBFF]/50 dark:bg-slate-800 shrink-0" />
      </div>

      {/* Navigation Tabs Strip Skeleton */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonLine
            key={i}
            width={i === 0 ? 'w-32' : 'w-28'}
            height="h-9"
            className="rounded-full shrink-0"
          />
        ))}
      </div>

      {/* 3-Column Top Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Current Intake */}
        <div className="lg:col-span-3 rounded-2xl border border-[#E3EAF3] dark:border-slate-800 bg-[#FFFFFF] dark:bg-slate-900 p-5 space-y-4">
          <SkeletonLine width="w-28" height="h-4" />
          <SkeletonLine width="w-36" height="h-6" />
          <div className="space-y-3 pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <SkeletonLine width="w-24" height="h-3.5" />
                <SkeletonLine width="w-20" height="h-3.5" />
              </div>
            ))}
          </div>
        </div>

        {/* Available Programs */}
        <div className="lg:col-span-6 rounded-2xl border border-[#E3EAF3] dark:border-slate-800 bg-[#FFFFFF] dark:bg-slate-900 p-5 space-y-4">
          <div className="flex justify-between">
            <SkeletonLine width="w-36" height="h-5" />
            <SkeletonLine width="w-24" height="h-4" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="p-3 rounded-xl border border-[#E3EAF3] dark:border-slate-800 bg-[#F5F8FC] dark:bg-slate-800/40 space-y-2"
              >
                <SkeletonLine width="w-10" height="h-4" className="rounded-full" />
                <SkeletonLine width="w-full" height="h-4" />
                <SkeletonLine width="w-16" height="h-3" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-xl border border-[#E3EAF3] dark:border-slate-800 bg-[#F5F8FC] dark:bg-slate-800/40 space-y-2">
              <SkeletonLine width="w-32" height="h-4" />
              <SkeletonLine width="w-20" height="h-3" />
            </div>
            <div className="p-3 rounded-xl border border-[#E3EAF3] dark:border-slate-800 bg-[#F5F8FC] dark:bg-slate-800/40 space-y-2">
              <SkeletonLine width="w-32" height="h-4" />
              <SkeletonLine width="w-20" height="h-3" />
            </div>
          </div>
        </div>

        {/* Refund Policy */}
        <div className="lg:col-span-3 rounded-2xl border border-[#E3EAF3] dark:border-slate-800 bg-[#FFFFFF] dark:bg-slate-900 p-5 space-y-4">
          <SkeletonLine width="w-32" height="h-4" />
          <div className="space-y-3 pt-1">
            <SkeletonLine width="w-full" height="h-3.5" />
            <SkeletonLine width="w-5/6" height="h-3.5" />
            <SkeletonLine width="w-4/5" height="h-3.5" />
          </div>
          <SkeletonLine width="w-full" height="h-8" className="rounded-lg mt-6" />
        </div>
      </div>

      {/* 3-Column Bottom Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-[#E3EAF3] dark:border-slate-800 bg-[#FFFFFF] dark:bg-slate-900 p-5 space-y-3"
          >
            <div className="flex justify-between">
              <SkeletonLine width="w-28" height="h-4" />
              <SkeletonLine width="w-16" height="h-3.5" />
            </div>
            <SkeletonLine width="w-36" height="h-5" />
            <SkeletonLine width="w-full" height="h-3.5" />
            <SkeletonLine width="w-2/3" height="h-3.5" />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Dashboard Overview Skeleton
 */
export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6 animate-page-enter">
    {/* Welcome Banner Skeleton */}
    <div className="p-6 rounded-md bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 space-y-3">
      <SkeletonLine width="w-32" height="h-3.5" />
      <SkeletonLine width="w-72" height="h-6" />
      <SkeletonLine width="w-96" height="h-3.5" />
      <SkeletonLine width="w-full" height="h-2.5" className="rounded-full mt-4" />
    </div>

    {/* 4 KPI Strip Skeleton */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className={`animate-card-enter stagger-${i + 1} p-4 rounded-md bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 space-y-2`}
        >
          <div className="flex justify-between">
            <SkeletonLine width="w-28" height="h-3.5" />
            <SkeletonLine width="w-5" height="h-5" className="rounded-full" />
          </div>
          <SkeletonLine width="w-16" height="h-7" />
          <SkeletonLine width="w-32" height="h-3" />
        </div>
      ))}
    </div>

    {/* Pipeline Stages Skeleton */}
    <div className="p-5 rounded-md bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 space-y-4">
      <SkeletonLine width="w-64" height="h-5" />
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="p-3 rounded-lg border border-[#E3EAF3] dark:border-slate-800 bg-[#F5F8FC] dark:bg-slate-800/50 space-y-2 text-center"
          >
            <SkeletonLine width="w-8" height="h-6" className="mx-auto" />
            <SkeletonLine width="w-16" height="h-3" className="mx-auto" />
          </div>
        ))}
      </div>
    </div>
  </div>
);
