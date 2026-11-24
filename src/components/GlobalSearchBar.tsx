import React, { useState, useEffect, useMemo, useRef, useCallback, useId } from 'react';
import {
  Search,
  X,
  CheckSquare,
  UserRound,
  GraduationCap,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  Building2,
  Users,
  ArrowUpRight,
  Clock,
  Sparkles,
  CornerDownLeft,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { MotionButton } from './animations';

export type SearchGroup = 'Tasks' | 'Students' | 'Universities' | 'Projects';

export interface GlobalSearchItem {
  id: string;
  title: string;
  group: SearchGroup;
  meta?: string;
  keywords?: string;
  badgeText?: string;
  badgeTone?: 'blue' | 'green' | 'amber' | 'red' | 'neutral';
}

export interface GlobalSearchAction {
  id: string;
  label: string;
  description?: string;
  icon: 'chart' | 'grid' | 'compass' | 'trend';
  shortcutKey?: string;
}

interface GlobalSearchBarProps {
  items: GlobalSearchItem[];
  groups?: SearchGroup[];
  recentIds?: string[];
  actions?: GlobalSearchAction[];
  examples?: string[];
  placeholder?: string;
  onSelect: (entry: GlobalSearchItem | GlobalSearchAction) => void;
  className?: string;
}

const RECENT_STORAGE_KEY = 'wecare_pms_recent_searches_v1';
const MAX_RECENT = 4;

const GROUP_CONFIG: Record<
  SearchGroup,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    accentClass: string;
    iconBgClass: string;
  }
> = {
  Tasks: {
    label: 'Tasks',
    icon: CheckSquare,
    accentClass: 'text-[#1E40AF] dark:text-[#4C8DF6]',
    iconBgClass: 'bg-[#EFF6FF] dark:bg-[#252528] border-[#E2E8F0] dark:border-[#2E2E32]',
  },
  Students: {
    label: 'Students',
    icon: UserRound,
    accentClass: 'text-[#16A34A] dark:text-[#34C26B]',
    iconBgClass: 'bg-[#DCFCE7]/60 dark:bg-[#252528] border-[#E2E8F0] dark:border-[#2E2E32]',
  },
  Universities: {
    label: 'Universities',
    icon: GraduationCap,
    accentClass: 'text-[#1E40AF] dark:text-[#4C8DF6]',
    iconBgClass: 'bg-[#EFF6FF] dark:bg-[#252528] border-[#E2E8F0] dark:border-[#2E2E32]',
  },
  Projects: {
    label: 'Projects',
    icon: FolderKanban,
    accentClass: 'text-[#D97706] dark:text-[#F0A030]',
    iconBgClass: 'bg-[#FEF3C7]/70 dark:bg-[#252528] border-[#E2E8F0] dark:border-[#2E2E32]',
  },
};

const ACTION_ICONS: Record<GlobalSearchAction['icon'], React.ComponentType<{ className?: string }>> = {
  chart: LayoutDashboard,
  grid: ListTodo,
  compass: Building2,
  trend: Users,
};

function renderHighlightedText(text: string, query: string): React.ReactNode {
  const trimmed = query.trim();
  if (!trimmed) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = trimmed.toLowerCase();
  const idx = lowerText.indexOf(lowerQuery);
  if (idx === -1) return text;

  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + trimmed.length);
  const after = text.slice(idx + trimmed.length);

  return (
    <>
      {before}
      <mark className="bg-[#EFF6FF] text-[#1E40AF] dark:bg-[rgba(76,141,246,0.14)] dark:text-[#6BA1F8] font-semibold rounded-[3px] px-0.5">
        {match}
      </mark>
      {renderHighlightedText(after, trimmed)}
    </>
  );
}

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  items,
  groups = ['Tasks', 'Students', 'Universities', 'Projects'],
  recentIds = [],
  actions = [],
  examples = [],
  placeholder = 'Search tasks, students, universities...',
  onSelect,
  className = '',
}) => {
  const reduceMotion = useReducedMotion() ?? false;
  const baseId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeScope, setActiveScope] = useState<'All' | SearchGroup>('All');
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [exampleIdx, setExampleIdx] = useState(0);
  const [persistedRecentIds, setPersistedRecentIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === 'string');
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });

  // Rotate hint examples gently while closed & empty
  useEffect(() => {
    if (isOpen || query.trim() || examples.length <= 1) return;
    const timer = window.setInterval(() => {
      setExampleIdx((i) => (i + 1) % examples.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, [isOpen, query, examples.length]);

  // Global Cmd+K / Ctrl+K shortcut to open & focus search bar
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(true);
        requestAnimationFrame(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [isOpen]);

  const trimmedQuery = query.trim().toLowerCase();

  // Score & filter items across title, meta, and keywords
  const matchedItems = useMemo(() => {
    if (!trimmedQuery) return [];
    const tokens = trimmedQuery.split(/\s+/).filter(Boolean);

    const scored: { item: GlobalSearchItem; score: number }[] = [];
    for (const item of items) {
      const titleLower = item.title.toLowerCase();
      const metaLower = (item.meta || '').toLowerCase();
      const keywordsLower = (item.keywords || '').toLowerCase();
      const combined = `${titleLower} ${metaLower} ${keywordsLower}`;

      // All tokens must match somewhere in combined fields
      if (!tokens.every((tok) => combined.includes(tok))) continue;

      let score = 0;
      if (titleLower === trimmedQuery) score += 100;
      else if (titleLower.startsWith(trimmedQuery)) score += 70;
      else if (titleLower.includes(trimmedQuery)) score += 45;
      else if (metaLower.includes(trimmedQuery)) score += 25;
      else score += 15;

      scored.push({ item, score });
    }

    scored.sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title));
    return scored.map((s) => s.item);
  }, [items, trimmedQuery]);

  // Scope counts when searching (or total counts when empty)
  const scopeCounts = useMemo(() => {
    const counts: Record<'All' | SearchGroup, number> = {
      All: 0,
      Tasks: 0,
      Students: 0,
      Universities: 0,
      Projects: 0,
    };
    const source = trimmedQuery ? matchedItems : items;
    counts.All = source.length;
    for (const item of source) {
      counts[item.group] = (counts[item.group] || 0) + 1;
    }
    return counts;
  }, [items, matchedItems, trimmedQuery]);

  // Visible results filtered by activeScope (when query exists or when user drills into a scope)
  const scopedItems = useMemo(() => {
    if (trimmedQuery) {
      return activeScope === 'All'
        ? matchedItems
        : matchedItems.filter((item) => item.group === activeScope);
    }
    if (activeScope !== 'All') {
      return items.filter((item) => item.group === activeScope).slice(0, 12);
    }
    return [];
  }, [trimmedQuery, activeScope, matchedItems, items]);

  // Group items cleanly for display
  const groupedResults = useMemo(() => {
    const map = new Map<SearchGroup, GlobalSearchItem[]>();
    for (const g of groups) map.set(g, []);
    for (const item of scopedItems) {
      const list = map.get(item.group) || [];
      list.push(item);
      map.set(item.group, list);
    }
    return groups
      .map((g) => ({ group: g, items: map.get(g) || [] }))
      .filter((entry) => entry.items.length > 0);
  }, [scopedItems, groups]);

  // Recent items: prefer user's actual recent selections, backfill with smart defaults
  const resolvedRecents = useMemo(() => {
    const mergedIds = Array.from(new Set([...persistedRecentIds, ...recentIds]));
    const byId = new Map(items.map((i) => [i.id, i]));
    const resolved: GlobalSearchItem[] = [];
    for (const id of mergedIds) {
      const found = byId.get(id);
      if (found) resolved.push(found);
      if (resolved.length >= MAX_RECENT) break;
    }
    return resolved;
  }, [persistedRecentIds, recentIds, items]);

  // Flat navigable entries for Up/Down keyboard navigation
  const navigableEntries = useMemo<(GlobalSearchItem | GlobalSearchAction)[]>(() => {
    if (trimmedQuery || activeScope !== 'All') {
      return scopedItems;
    }
    return [...resolvedRecents, ...actions];
  }, [trimmedQuery, activeScope, scopedItems, resolvedRecents, actions]);

  useEffect(() => {
    setActiveIndex(0);
  }, [trimmedQuery, activeScope, isOpen]);

  const handleSelectEntry = useCallback(
    (entry: GlobalSearchItem | GlobalSearchAction) => {
      if (!('label' in entry)) {
        // Record to recent searches
        setPersistedRecentIds((prev) => {
          const next = [entry.id, ...prev.filter((id) => id !== entry.id)].slice(0, MAX_RECENT);
          try {
            localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });
      }
      setIsOpen(false);
      setQuery('');
      setActiveScope('All');
      inputRef.current?.blur();
      onSelect(entry);
    },
    [onSelect]
  );

  const cycleScope = useCallback(
    (dir: -1 | 1) => {
      const scopes: ('All' | SearchGroup)[] = ['All', ...groups];
      const currentIdx = scopes.indexOf(activeScope);
      const nextIdx = (currentIdx + dir + scopes.length) % scopes.length;
      setActiveScope(scopes[nextIdx]);
    },
    [activeScope, groups]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsOpen(true);
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      if (query) {
        setQuery('');
      } else if (activeScope !== 'All') {
        setActiveScope('All');
      } else {
        setIsOpen(false);
        inputRef.current?.blur();
      }
      return;
    }

    if (e.altKey && e.key === 'ArrowRight') {
      e.preventDefault();
      cycleScope(1);
      return;
    }

    if (e.altKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      cycleScope(-1);
      return;
    }

    // Quick number jump when input is empty and dropdown is open (Alt+1..4)
    if (e.altKey && ['1', '2', '3', '4'].includes(e.key)) {
      const action = actions.find((a) => a.shortcutKey === e.key);
      if (action) {
        e.preventDefault();
        handleSelectEntry(action);
        return;
      }
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (navigableEntries.length > 0) {
        setActiveIndex((prev) => (prev + 1) % navigableEntries.length);
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (navigableEntries.length > 0) {
        setActiveIndex((prev) => (prev - 1 + navigableEntries.length) % navigableEntries.length);
      }
      return;
    }

    if (e.key === 'Enter' && isOpen && navigableEntries.length > 0) {
      e.preventDefault();
      const target = navigableEntries[Math.min(activeIndex, navigableEntries.length - 1)];
      if (target) handleSelectEntry(target);
    }
  };

  // Scroll highlighted row into view
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-nav-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen]);

  const scopeOptions: ('All' | SearchGroup)[] = ['All', ...groups];

  return (
    <div
      ref={containerRef}
      className={`relative w-full flex-1 max-w-[460px] lg:max-w-[520px] z-40 ${className}`}
    >
      {/* Search Combobox Bar */}
      <div
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
        className={`h-10 w-full flex items-center gap-2 pl-3 pr-2 rounded-lg border transition-colors cursor-text ${
          isOpen
            ? 'bg-white dark:bg-[#1C1C1E] border-[#1E40AF] dark:border-[#4C8DF6] ring-2 ring-[#1E40AF]/15 dark:ring-0 shadow-sm dark:shadow-none'
            : 'bg-[#F8FAFC] dark:bg-[#252528] border-[#E2E8F0] dark:border-[#2E2E32] hover:border-[#1E40AF]/45 dark:hover:border-[#3A3A3F]'
        }`}
      >
        <Search
          className={`w-4 h-4 shrink-0 transition-colors ${
            isOpen
              ? 'text-[#1E40AF] dark:text-[#4C8DF6]'
              : 'text-[#64748B] dark:text-[#9A9AA2]'
          }`}
        />

        {activeScope !== 'All' && (
          <MotionButton
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveScope('All');
              inputRef.current?.focus();
            }}
            title={`Filtering by ${activeScope}. Click to clear scope`}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#EFF6FF] dark:bg-[rgba(76,141,246,0.14)] border border-[#1E40AF]/25 dark:border-[#4C8DF6]/35 text-[#1E40AF] dark:text-[#4C8DF6] text-[11px] font-semibold shrink-0 hover:bg-[#DBEAFE] dark:hover:bg-[rgba(76,141,246,0.22)] transition-colors"
          >
            <span>{activeScope}</span>
            <X className="w-2.5 h-2.5" />
          </MotionButton>
        )}

        <div className="relative flex-1 min-w-0 h-full flex items-center">
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-label="Global workspace search"
            aria-expanded={isOpen}
            aria-controls={`${baseId}-listbox`}
            data-search-combobox="true"
            value={query}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              !isOpen && examples.length > 0
                ? ''
                : placeholder
            }
            className="w-full h-full bg-transparent text-xs sm:text-[13px] text-[#0F172A] dark:text-[#ECECEE] placeholder:text-[#64748B] dark:placeholder:text-[#9A9AA2] focus:outline-none border-0 p-0"
          />

          {/* Smooth Rotating Placeholder Hint when unfocused and empty */}
          {!isOpen && !query && examples.length > 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center text-xs sm:text-[13px] text-[#64748B] dark:text-[#9A9AA2] overflow-hidden">
              <span className="truncate">{placeholder}</span>
              <span className="hidden md:inline-flex items-center ml-1.5 text-[11px] text-[#64748B]/80 dark:text-[#66666E]">
                e.g.
                <AnimatePresence mode="wait">
                  <motion.span
                    key={examples[exampleIdx]}
                    initial={reduceMotion ? undefined : { opacity: 0, y: 4 }}
                    animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="ml-1 font-medium text-[#1E40AF] dark:text-[#4C8DF6]"
                  >
                    &ldquo;{examples[exampleIdx]}&rdquo;
                  </motion.span>
                </AnimatePresence>
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {query && (
            <MotionButton
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Clear search query"
              className="w-6 h-6 rounded-md flex items-center justify-center text-[#64748B] dark:text-[#9A9AA2] hover:text-[#0F172A] dark:hover:text-[#ECECEE] hover:bg-[#E2E8F0]/60 dark:hover:bg-[#3A3A3F]/60 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </MotionButton>
          )}

          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-[#64748B] dark:text-[#9A9AA2] bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded select-none">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Animated Dropdown Workspace */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id={`${baseId}-listbox`}
            role="listbox"
            aria-label="Search results"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.99 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.99 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 w-[min(580px,calc(100vw-24px))] top-[calc(100%+8px)] bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-xl shadow-2xl dark:shadow-none overflow-hidden z-50"
          >
            {/* Scope Filter Tabs */}
            <div className="px-3 py-2 bg-[#F8FAFC] dark:bg-[#161616] border-b border-[#E2E8F0] dark:border-[#2E2E32] flex items-center gap-1 overflow-x-auto">
              {scopeOptions.map((scope) => {
                const isSelected = activeScope === scope;
                const count = scopeCounts[scope] ?? 0;
                return (
                  <MotionButton
                    key={scope}
                    type="button"
                    onClick={() => {
                      setActiveScope(scope);
                      inputRef.current?.focus();
                    }}
                    className={`relative px-2.5 py-1 rounded-md text-[11px] font-medium inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                      isSelected
                        ? 'text-white'
                        : 'text-[#64748B] dark:text-[#9A9AA2] hover:text-[#0F172A] dark:hover:text-[#ECECEE] hover:bg-white/70 dark:hover:bg-[#252528]'
                    }`}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId={`${baseId}-scope-pill`}
                        transition={reduceMotion ? { duration: 0 } : { type: 'spring', duration: 0.3, bounce: 0.15 }}
                        className="absolute inset-0 rounded-md bg-[#1E40AF] dark:bg-[#4C8DF6] shadow-xs dark:shadow-none"
                      />
                    )}
                    <span className="relative z-10">{scope}</span>
                    <span
                      className={`relative z-10 px-1.5 py-0.2 rounded text-[10px] tabular-nums font-semibold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : `bg-[#E2E8F0]/70 dark:bg-[#252528] ${count === 0 ? 'text-[#64748B] dark:text-[#66666E]' : 'text-[#64748B] dark:text-[#9A9AA2]'}`
                      }`}
                    >
                      {count}
                    </span>
                  </MotionButton>
                );
              })}
            </div>

            {/* Scrollable Content */}
            <div ref={listRef} className="max-h-[420px] overflow-y-auto overscroll-contain p-3 space-y-4">
              {!trimmedQuery && activeScope === 'All' ? (
                <>
                  {/* Recent / Quick Resume */}
                  {resolvedRecents.length > 0 && (
                    <section className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#9A9AA2] flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-[#1E40AF] dark:text-[#4C8DF6]" />
                          Recent &amp; Active Records
                        </h4>
                        <span className="text-[10px] text-[#64748B] dark:text-[#9A9AA2] tabular-nums">
                          {items.length} indexed records
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {resolvedRecents.map((item, idx) => {
                          const cfg = GROUP_CONFIG[item.group];
                          const Icon = cfg.icon;
                          const isHighlighted = activeIndex === idx;
                          return (
                            <MotionButton
                              key={item.id}
                              type="button"
                              data-nav-idx={idx}
                              onMouseEnter={() => setActiveIndex(idx)}
                              onClick={() => handleSelectEntry(item)}
                              className={`w-full text-left p-2.5 rounded-lg border transition-colors flex items-start gap-2.5 ${
                                isHighlighted
                                  ? 'bg-[#EFF6FF] dark:bg-[#252528] border-[#1E40AF]/50 dark:border-[#4C8DF6]'
                                  : 'bg-[#F8FAFC] dark:bg-[#1C1C1E] border-[#E2E8F0] dark:border-[#2E2E32] hover:border-[#1E40AF]/40 dark:hover:border-[#3A3A3F]'
                              }`}
                            >
                              <div
                                className={`w-7 h-7 rounded-md border flex items-center justify-center shrink-0 ${cfg.iconBgClass}`}
                              >
                                <Icon className={`w-3.5 h-3.5 ${cfg.accentClass}`} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-[#0F172A] dark:text-[#ECECEE] truncate">
                                  {item.title}
                                </div>
                                {item.meta && (
                                  <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2] truncate mt-0.5">
                                    {item.meta}
                                  </div>
                                )}
                              </div>
                              <ArrowUpRight className="w-3.5 h-3.5 text-[#64748B] dark:text-[#9A9AA2] shrink-0 mt-0.5" />
                            </MotionButton>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {/* Quick Navigation Actions */}
                  {actions.length > 0 && (
                    <section className="space-y-1.5">
                      <h4 className="px-1 text-[11px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#9A9AA2]">
                        Quick Navigation
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {actions.map((act, idx) => {
                          const navIdx = resolvedRecents.length + idx;
                          const Icon = ACTION_ICONS[act.icon];
                          const isHighlighted = activeIndex === navIdx;
                          return (
                            <MotionButton
                              key={act.id}
                              type="button"
                              data-nav-idx={navIdx}
                              onMouseEnter={() => setActiveIndex(navIdx)}
                              onClick={() => handleSelectEntry(act)}
                              className={`w-full text-left px-2.5 py-2 rounded-lg border transition-colors flex items-center justify-between gap-2 ${
                                isHighlighted
                                  ? 'bg-[#EFF6FF] dark:bg-[#252528] border-[#1E40AF]/50 dark:border-[#4C8DF6]'
                                  : 'bg-white dark:bg-[#1C1C1E] border-[#E2E8F0] dark:border-[#2E2E32] hover:bg-[#F8FAFC] dark:hover:bg-[#252528]'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Icon className="w-3.5 h-3.5 text-[#1E40AF] dark:text-[#4C8DF6] shrink-0" />
                                <span className="text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] truncate">
                                  {act.label}
                                </span>
                              </div>
                              {act.shortcutKey && (
                                <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-[#64748B] dark:text-[#9A9AA2] bg-[#F8FAFC] dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#2E2E32] rounded shrink-0">
                                  Alt+{act.shortcutKey}
                                </kbd>
                              )}
                            </MotionButton>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {/* Search Suggestions / Examples */}
                  {examples.length > 0 && (
                    <section className="space-y-1.5 pt-1 border-t border-[#E2E8F0] dark:border-[#2E2E32]">
                      <div className="px-1 text-[11px] font-medium text-[#64748B] dark:text-[#9A9AA2] flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-[#1E40AF] dark:text-[#4C8DF6]" />
                        <span>Try searching for:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 px-1">
                        {examples.map((ex) => (
                          <MotionButton
                            key={ex}
                            type="button"
                            onClick={() => {
                              setQuery(ex);
                              inputRef.current?.focus();
                            }}
                            className="px-2.5 py-1 rounded-md text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] bg-[#F8FAFC] dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#2E2E32] hover:border-[#1E40AF] dark:hover:border-[#4C8DF6] hover:text-[#1E40AF] dark:hover:text-[#6BA1F8] transition-colors"
                          >
                            {ex}
                          </MotionButton>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              ) : groupedResults.length === 0 ? (
                <div className="py-10 px-4 text-center space-y-2.5">
                  <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#2E2E32] flex items-center justify-center mx-auto">
                    <Search className="w-4 h-4 text-[#1E40AF] dark:text-[#4C8DF6]" />
                  </div>
                  <div className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                    No matches found{trimmedQuery ? ` for “${query.trim()}”` : ''}
                  </div>
                  <p className="text-xs text-[#64748B] dark:text-[#9A9AA2] max-w-sm mx-auto">
                    Try searching by student name, passport number, university city or Hangul name, task assignee, or intake term.
                  </p>
                  <div className="pt-1">
                    <MotionButton
                      type="button"
                      onClick={() => {
                        setQuery('');
                        setActiveScope('All');
                        inputRef.current?.focus();
                      }}
                      className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-[#1E40AF] dark:text-[#4C8DF6] bg-[#EFF6FF] dark:bg-[rgba(76,141,246,0.14)] border border-[#1E40AF]/25 dark:border-[#4C8DF6]/35 rounded-lg hover:bg-[#DBEAFE] dark:hover:bg-[rgba(76,141,246,0.22)] transition-colors"
                    >
                      Reset search &amp; scope
                    </MotionButton>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {(() => {
                    let runningIdx = 0;
                    return groupedResults.map(({ group, items: groupItems }) => {
                      const cfg = GROUP_CONFIG[group];
                      const Icon = cfg.icon;
                      return (
                        <section key={group} className="space-y-1.5">
                          <div className="px-1 flex items-center justify-between">
                            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#9A9AA2] flex items-center gap-1.5">
                              <Icon className={`w-3.5 h-3.5 ${cfg.accentClass}`} />
                              <span>{cfg.label}</span>
                            </h4>
                            <span className="text-[10px] font-semibold tabular-nums text-[#64748B] dark:text-[#9A9AA2]">
                              {groupItems.length}
                            </span>
                          </div>

                          <div className="space-y-1">
                            {groupItems.map((item) => {
                              const currentIdx = runningIdx++;
                              const isHighlighted = activeIndex === currentIdx;
                              return (
                                <MotionButton
                                  key={item.id}
                                  type="button"
                                  data-nav-idx={currentIdx}
                                  onMouseEnter={() => setActiveIndex(currentIdx)}
                                  onClick={() => handleSelectEntry(item)}
                                  className={`w-full text-left px-3 py-2 rounded-lg border transition-colors flex items-center justify-between gap-3 ${
                                    isHighlighted
                                      ? 'bg-[#EFF6FF] dark:bg-[#252528] border-[#1E40AF]/45 dark:border-[#4C8DF6]'
                                      : 'bg-white dark:bg-[#1C1C1E] border-transparent hover:bg-[#F8FAFC] dark:hover:bg-[#252528] hover:border-[#E2E8F0] dark:hover:border-[#3A3A3F]'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <div
                                      className={`w-7 h-7 rounded-md border flex items-center justify-center shrink-0 ${cfg.iconBgClass}`}
                                    >
                                      <Icon className={`w-3.5 h-3.5 ${cfg.accentClass}`} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-xs font-semibold text-[#0F172A] dark:text-[#ECECEE] truncate">
                                        {renderHighlightedText(item.title, query)}
                                      </div>
                                      {item.meta && (
                                        <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2] truncate mt-0.5">
                                          {renderHighlightedText(item.meta, query)}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    {item.badgeText && (
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold tabular-nums ${
                                          item.badgeTone === 'green'
                                            ? 'bg-[#DCFCE7] text-[#16A34A] dark:bg-[rgba(52,194,107,0.14)] dark:text-[#34C26B]'
                                            : item.badgeTone === 'amber'
                                            ? 'bg-[#FEF3C7] text-[#D97706] dark:bg-[rgba(240,160,48,0.14)] dark:text-[#F0A030]'
                                            : item.badgeTone === 'red'
                                            ? 'bg-[#FEE2E2] text-[#DC2626] dark:bg-[rgba(239,83,80,0.14)] dark:text-[#EF5350]'
                                            : item.badgeTone === 'blue'
                                            ? 'bg-[#EFF6FF] text-[#1E40AF] dark:bg-[rgba(76,141,246,0.14)] dark:text-[#4C8DF6]'
                                            : 'bg-[#F8FAFC] text-[#64748B] dark:bg-[#252528] dark:text-[#9A9AA2]'
                                        }`}
                                      >
                                        {item.badgeText}
                                      </span>
                                    )}
                                    {isHighlighted && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#1E40AF] dark:bg-[#4C8DF6] text-white text-[10px] font-semibold">
                                        Open
                                        <CornerDownLeft className="w-2.5 h-2.5" />
                                      </span>
                                    )}
                                  </div>
                                </MotionButton>
                              );
                            })}
                          </div>
                        </section>
                      );
                    });
                  })()}
                </div>
              )}
            </div>

            {/* Keyboard Navigation Footer */}
            <div className="px-3 py-2 bg-[#F8FAFC] dark:bg-[#161616] border-t border-[#E2E8F0] dark:border-[#2E2E32] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#64748B] dark:text-[#9A9AA2]">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <kbd className="px-1 py-0.2 bg-white dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#2E2E32] rounded text-[10px]">
                    ↑↓
                  </kbd>
                  <span>Navigate</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="px-1 py-0.2 bg-white dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#2E2E32] rounded text-[10px]">
                    Alt+←/→
                  </kbd>
                  <span>Scope</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="px-1 py-0.2 bg-white dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#2E2E32] rounded text-[10px]">
                    ↵
                  </kbd>
                  <span>Open</span>
                </span>
              </div>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1 py-0.2 bg-white dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#2E2E32] rounded text-[10px]">
                  Esc
                </kbd>
                <span>{query ? 'Clear' : 'Close'}</span>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
