import React from 'react';
import { ShieldCheck, UserCheck, ChevronDown, Check } from 'lucide-react';
import { UserProfile } from '../types/pms';
import { DropdownTransition, MotionButton } from './animations';
import { AnimatePresence } from 'motion/react';

interface RoleSwitcherBarProps {
  currentUser: UserProfile;
  team: UserProfile[];
  onSwitchUser: (user: UserProfile) => void;
}

export const RoleSwitcherBar: React.FC<RoleSwitcherBarProps> = ({
  currentUser,
  team,
  onSwitchUser,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  // If currently simulating a consultant, allow quick reset to Admin
  const isAdmin = currentUser.role === 'Admission_Manager';

  return (
    <div className="relative">
      <MotionButton
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`h-9 flex items-center gap-2 px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
          isAdmin
            ? 'bg-white dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-100 hover:border-[#1E40AF] dark:hover:border-blue-500'
            : 'bg-white dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-100 hover:border-[#1E40AF] dark:hover:border-blue-500'
        }`}
        title="Admin Persona Switcher: Switch between Admission Manager and Consultants to test access & notifications"
      >
        <span className="flex items-center gap-1.5">
          {isAdmin ? (
            <ShieldCheck className="w-3.5 h-3.5 text-[#1E40AF] dark:text-blue-400 shrink-0" />
          ) : (
            <UserCheck className="w-3.5 h-3.5 text-[#1E40AF] dark:text-blue-400 shrink-0" />
          )}
          <span className="font-medium">{currentUser.name}</span>
          <span className="text-[11px] text-[#64748B] dark:text-slate-400 hidden sm:inline">
            ({isAdmin ? 'Manager / Admin' : 'Consultant'})
          </span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#64748B] dark:text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </MotionButton>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <DropdownTransition
              align="right"
              className="absolute right-0 mt-1 w-72 rounded-lg bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 shadow-xl z-50 p-1 space-y-0.5 max-h-80 overflow-y-auto"
            >
              <div className="px-2 py-1 text-[10px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase tabular-nums border-b border-[#E2E8F0] dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
                <span>Switch Operational Persona</span>
                <span>{team.length} Members</span>
              </div>
              {team.map((user) => {
                const isSelected = user.id === currentUser.id;
                const isUserAdmin = user.role === 'Admission_Manager';
                const teamLabel = user.team === 'Counseling Team' ? 'Counseling' : 'Admission';

                return (
                  <MotionButton
                    key={user.id}
                    type="button"
                    whileHover={{ scale: 1.01 }}
                    onClick={() => {
                      onSwitchUser(user);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-left text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#EFF6FF] dark:bg-blue-900/40 font-medium text-[#1E40AF] dark:text-blue-300'
                        : 'text-[#64748B] dark:text-slate-300 hover:bg-[#F8FAFC] dark:hover:bg-slate-700/60 hover:text-[#0F172A] dark:hover:text-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-5 h-5 rounded-full object-cover shrink-0 border border-[#E2E8F0] dark:border-slate-700"
                      />
                      <div className="truncate">
                        <div className="truncate font-medium flex items-center gap-1.5">
                          <span>{user.name}</span>
                          <span
                            className={`px-1 py-0.2 rounded text-[9px] font-semibold ${
                              user.team === 'Counseling Team'
                                ? 'bg-[#F8FAFC] text-[#1E3A8A] border border-[#E2E8F0] dark:bg-slate-800 dark:text-sky-300 dark:border-slate-700'
                                : 'bg-[#EFF6FF] text-[#1E40AF] dark:bg-blue-950 dark:text-blue-300'
                            }`}
                          >
                            {teamLabel}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                          {isUserAdmin ? 'Admission Manager' : user.title}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="h-3 w-3 shrink-0 text-[#1E40AF] dark:text-blue-400" />
                    )}
                  </MotionButton>
                );
              })}
            </DropdownTransition>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
