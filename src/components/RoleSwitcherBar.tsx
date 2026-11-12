import React from 'react';
import { ShieldCheck, UserCheck, ChevronDown, Check } from 'lucide-react';
import { UserProfile } from '../types/pms';

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
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all ${
          isAdmin
            ? 'bg-[#DCEBFF] dark:bg-blue-950/40 border-[#36A5F5]/40 dark:border-blue-900/60 text-[#123B78] dark:text-blue-300 hover:bg-[#DCEBFF]/80'
            : 'bg-[#F5F8FC] dark:bg-slate-800 border-[#E3EAF3] dark:border-slate-700 text-[#172B4D] dark:text-slate-200 hover:bg-[#DCEBFF]/60'
        }`}
        title="Admin Persona Switcher: Switch between Admission Manager and Consultants to test access & notifications"
      >
        <span className="flex items-center gap-1.5">
          {isAdmin ? (
            <ShieldCheck className="w-3.5 h-3.5 text-[#1769E8] dark:text-blue-400 shrink-0" />
          ) : (
            <UserCheck className="w-3.5 h-3.5 text-[#1769E8] dark:text-blue-400 shrink-0" />
          )}
          <span className="font-semibold">{currentUser.name}</span>
          <span className="text-[11px] opacity-75 hidden sm:inline">
            ({isAdmin ? 'Manager / Admin' : 'Consultant'})
          </span>
        </span>
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-1 w-72 rounded-md bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 shadow-xl z-50 p-1.5 space-y-1 animate-dropdown-enter max-h-80 overflow-y-auto">
            <div className="px-2 py-1 text-[10px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase font-mono border-b border-[#E3EAF3] dark:border-slate-800 flex items-center justify-between sticky top-0 bg-[#FFFFFF] dark:bg-slate-900 z-10">
              <span>Switch Operational Persona</span>
              <span>{team.length} Members</span>
            </div>
            {team.map((user) => {
              const isSelected = user.id === currentUser.id;
              const isUserAdmin = user.role === 'Admission_Manager';
              const teamLabel = user.team === 'Counseling Team' ? 'Counseling' : 'Admission';

              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => {
                    onSwitchUser(user);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left text-xs transition-colors ${
                    isSelected
                      ? 'bg-[#DCEBFF] dark:bg-slate-800 font-semibold text-[#123B78] dark:text-slate-100'
                      : 'text-[#172B4D] dark:text-slate-300 hover:bg-[#F5F8FC] dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-5 h-5 rounded-full object-cover shrink-0 border border-[#E3EAF3] dark:border-slate-700"
                    />
                    <div className="truncate">
                      <div className="truncate font-medium flex items-center gap-1.5">
                        <span>{user.name}</span>
                        <span className={`px-1 py-0.2 rounded text-[9px] font-semibold ${
                          user.team === 'Counseling Team'
                            ? 'bg-[#F5F8FC] text-[#123B78] border border-[#E3EAF3] dark:bg-slate-800 dark:text-sky-300 dark:border-slate-700'
                            : 'bg-[#DCEBFF] text-[#1769E8] dark:bg-blue-950 dark:text-blue-300'
                        }`}>
                          {teamLabel}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                        {isUserAdmin ? 'Admission Manager' : user.title}
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#1769E8] dark:text-blue-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
