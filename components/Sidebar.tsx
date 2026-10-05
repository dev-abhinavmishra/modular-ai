import React from 'react';
import { View } from '../types';
import { useUsage } from '../services/usageService';

interface SidebarProps {
  currentView: View;
  onChangeView: (view: View) => void;
  onUpgrade: () => void;
  onOpenPalette: () => void;
}

const UsageBadge: React.FC<{ onUpgrade: () => void }> = ({ onUpgrade }) => {
  const usage = useUsage();
  const pct = usage.limit > 0 ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0;
  const low = usage.remaining <= 3;

  return (
    <>
      {/* Compact bolt for collapsed sidebar */}
      <button
        onClick={onUpgrade}
        className="lg:hidden w-full flex items-center justify-center py-2 mb-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        title={`${usage.remaining} free uses left today`}
      >
        <span className={`material-symbols-outlined ${low ? 'text-amber-500' : 'text-[var(--theme-color)]'}`}>bolt</span>
      </button>

      {/* Full badge for expanded sidebar (click to see details) */}
      <button
        onClick={onUpgrade}
        title="View daily usage"
        className="hidden lg:block w-full text-left rounded-xl border border-black/5 dark:border-white/10 bg-white dark:bg-white/5 p-3 mb-3 hover:border-[var(--theme-color)]/40 transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-[var(--theme-color)]">bolt</span>
            Free Usage
          </span>
          <span className={`text-[10px] font-black ${low ? 'text-amber-500' : 'text-slate-600 dark:text-neutral-300'}`}>
            {usage.remaining}/{usage.limit} left
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${low ? 'bg-amber-500' : 'bg-[var(--theme-color)]'}`}
            style={{ width: `${pct}%` }}
          ></div>
        </div>
        <span className="block mt-2 text-[10px] text-neutral-500">Resets automatically</span>
      </button>
    </>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, onUpgrade, onOpenPalette }) => {
  void onOpenPalette;
  const navItems = [
    { view: View.RECORDER, icon: 'mic', label: 'Active Record' },
    { view: View.LIBRARY, icon: 'folder_open', label: 'Library' },
    { view: View.ANALYSIS, icon: 'analytics', label: 'Global Analysis' },
  ];

  const savedItems = [
    { view: View.BOOKMARKS, icon: 'bookmark', label: 'Bookmarks' },
    { view: View.HISTORY, icon: 'history', label: 'History' },
  ];

  const renderButton = (item: {view: View, icon: string, label: string}) => {
     const isActive = currentView === item.view;
     return (
        <button
          key={item.view}
          onClick={() => onChangeView(item.view)}
          className={`flex items-center justify-center lg:justify-start gap-3 px-3 py-3 rounded-lg transition-all w-full text-left group ${
            isActive 
              ? 'bg-[rgba(var(--theme-rgb),0.1)] text-[var(--theme-color)] border border-[rgba(var(--theme-rgb),0.1)]' 
              : 'text-neutral-500 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white border border-transparent'
          }`}
        >
          <span className="material-symbols-outlined group-hover:scale-105 transition-transform" style={isActive ? {fontVariationSettings: "'FILL' 1"} : {}}>{item.icon}</span>
          <span className="text-sm font-medium hidden lg:block font-body">{item.label}</span>
        </button>
      );
  };

  return (
    <aside className="w-16 md:w-20 lg:w-72 flex flex-col border-r border-black/5 dark:border-white/10 bg-white dark:bg-[#050505] z-20 shrink-0 transition-colors">
      <div className="h-16 md:h-20 flex items-center justify-center lg:justify-start lg:px-6 border-b border-black/5 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-[var(--theme-color)] flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(var(--theme-rgb),0.3)]">
            <span className="material-symbols-outlined text-black text-xl font-bold">graphic_eq</span>
          </div>
          <span className="text-xl font-bold tracking-tight hidden lg:block text-slate-900 dark:text-white font-display">Modular AI</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 flex flex-col gap-1 px-2 md:px-4">
        <div className="mb-2 px-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden lg:block font-display">Workspace</div>
        {navItems.map(renderButton)}

        <div className="my-4 border-t border-black/5 dark:border-white/5"></div>
        <div className="mb-2 px-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden lg:block font-display">Saved</div>
        {savedItems.map(renderButton)}
      </nav>

      <div className="p-2 md:p-4 border-t border-black/5 dark:border-white/10 bg-neutral-50 dark:bg-[#121212]">
        <UsageBadge onUpgrade={onUpgrade} />
        <button
          onClick={() => onChangeView(View.SETTINGS)}
          className={`flex items-center justify-center lg:justify-start gap-3 px-3 py-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors w-full text-left ${currentView === View.SETTINGS ? 'bg-[rgba(var(--theme-rgb),0.1)] text-[var(--theme-color)] border border-[rgba(var(--theme-rgb),0.1)]' : 'text-neutral-500 dark:text-neutral-400 border border-transparent'}`}
        >
          <span className="material-symbols-outlined" style={currentView === View.SETTINGS ? {fontVariationSettings: "'FILL' 1"} : {}}>settings</span>
          <span className="text-sm font-medium hidden lg:block font-body">Settings</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;