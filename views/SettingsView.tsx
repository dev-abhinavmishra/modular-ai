import React from 'react';
import { AppSettings } from '../types';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onClearData: () => void;
  onNotesChanged?: () => void;
}

const THEME_COLORS = [
    { name: 'Neon Lime', value: '#c4f20d' },
    { name: 'Cyber Cyan', value: '#22d3ee' },
    { name: 'Electric Blue', value: '#3b82f6' },
    { name: 'Ultraviolet', value: '#a855f7' },
    { name: 'Hot Magenta', value: '#ec4899' },
    { name: 'Solar Orange', value: '#f97316' },
    { name: 'Acid Green', value: '#39ff14' },
    { name: 'Teal', value: '#14b8a6' },
];

const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdateSettings, onClearData }) => {
  const [showClearConfirm, setShowClearConfirm] = React.useState(false);

  const toggleTheme = () => {
    onUpdateSettings({ ...settings, darkMode: !settings.darkMode });
  };

  return (
    <main className="flex-1 flex flex-col min-w-0 relative bg-[#f4f4f5] dark:bg-[#09090b] overflow-y-auto">
      <header className="shrink-0 h-16 md:h-20 border-b border-black/5 dark:border-white/10 flex items-center justify-between px-4 md:px-8 bg-white/50 dark:bg-[#09090b]/90 backdrop-blur-md z-10 sticky top-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-none font-display">Settings</h1>
      </header>

      <div className="max-w-3xl mx-auto w-full p-4 md:p-8 lg:p-12 space-y-6 md:space-y-10">
        
        {/* Appearance */}
        <section className="bg-white dark:bg-[#18181b] rounded-2xl md:rounded-3xl border border-black/5 dark:border-white/5 p-5 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
            <div className="w-10 h-10 rounded-xl bg-[var(--theme-color)]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[var(--theme-color)]">palette</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white font-display">Appearance</h2>
          </div>
          
          <div className="flex items-center justify-between py-4 border-b border-black/5 dark:border-white/5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Dark Mode</h3>
              <p className="text-xs text-neutral-500 mt-1">Switch between light and dark themes</p>
            </div>
            <button 
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-color)] focus:ring-offset-2 dark:focus:ring-offset-black ${settings.darkMode ? 'bg-[var(--theme-color)]' : 'bg-neutral-200 dark:bg-neutral-700'}`}
            >
              <span className="sr-only">Toggle Dark Mode</span>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out shadow-sm ${settings.darkMode ? 'translate-x-6' : 'translate-x-1'}`}></span>
            </button>
          </div>

           <div className="py-4 border-b border-black/5 dark:border-white/5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Accent Color</h3>
            <p className="text-xs text-neutral-500 mb-3">Neon Lime by default — pick any accent to theme the app.</p>
            <div className="flex gap-3 flex-wrap items-center">
                {THEME_COLORS.map(color => (
                    <button
                        key={color.value}
                        onClick={() => onUpdateSettings({ ...settings, themeColor: color.value })}
                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 ${settings.themeColor === color.value ? 'border-white dark:border-white ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#18181b]' : 'border-transparent'}`}
                        style={{ backgroundColor: color.value, boxShadow: settings.themeColor === color.value ? `0 0 16px ${color.value}` : undefined }}
                        title={color.name}
                    >
                        {settings.themeColor === color.value && <span className="material-symbols-outlined text-black text-sm font-bold">check</span>}
                    </button>
                ))}
            </div>
          </div>

          <div className="flex items-center justify-between py-4">
             <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Compact Mode</h3>
              <p className="text-xs text-neutral-500 mt-1">Reduce spacing in the library view</p>
            </div>
             <button 
                onClick={() => onUpdateSettings({ ...settings, compactMode: !settings.compactMode })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.compactMode ? 'bg-[var(--theme-color)]' : 'bg-neutral-200 dark:bg-neutral-700'}`}
             >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out shadow-sm ${settings.compactMode ? 'translate-x-6' : 'translate-x-1'}`}></span>
            </button>
          </div>
        </section>

        {/* AI Configuration */}
        <section className="bg-white dark:bg-[#18181b] rounded-2xl md:rounded-3xl border border-black/5 dark:border-white/5 p-5 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
            <div className="w-10 h-10 rounded-xl bg-[var(--theme-color)]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[var(--theme-color)]">smart_toy</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white font-display">AI Assistant</h2>
          </div>

          <div className="space-y-4">
             <div>
                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Default Note Format</label>
                <select 
                    value={settings.defaultNoteFormat}
                    onChange={(e) => onUpdateSettings({ ...settings, defaultNoteFormat: e.target.value as any })}
                    className="w-full rounded-lg bg-neutral-50 dark:bg-black/20 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white px-3 py-2 text-sm focus:border-[var(--theme-color)] focus:ring-[var(--theme-color)]"
                >
                    <option value="Structured">Structured (Headers & Bullets)</option>
                    <option value="Summary">Summary Paragraphs</option>
                    <option value="Transcript">Detailed Transcript</option>
                </select>
             </div>
             
             <div className="flex items-center justify-between py-4 border-t border-black/5 dark:border-white/5 mt-4">
                <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Auto-generate Titles</h3>
                <p className="text-xs text-neutral-500 mt-1">Let AI name your sessions based on content</p>
                </div>
                <button 
                    onClick={() => onUpdateSettings({ ...settings, autoGenerateTitles: !settings.autoGenerateTitles })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.autoGenerateTitles ? 'bg-[var(--theme-color)]' : 'bg-neutral-200 dark:bg-neutral-700'}`}
                >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out shadow-sm ${settings.autoGenerateTitles ? 'translate-x-6' : 'translate-x-1'}`}></span>
                </button>
            </div>
          </div>
        </section>
        
        {/* Data & Storage */}
        <section className="bg-white dark:bg-[#18181b] rounded-2xl md:rounded-3xl border border-black/5 dark:border-white/5 p-5 md:p-8 shadow-sm">
           <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
            <div className="w-10 h-10 rounded-xl bg-[var(--theme-color)]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[var(--theme-color)]">database</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white font-display">Data & Storage</h2>
          </div>
           <div className="flex items-center justify-between py-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Clear All History</h3>
              <p className="text-xs text-neutral-500 mt-1">Permanently remove all local notes</p>
            </div>
            <button 
                onClick={() => setShowClearConfirm(true)}
                className="px-4 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 text-xs font-bold transition-colors"
            >
                Clear Data
            </button>
          </div>
        </section>

      </div>

      {/* Clear Data Confirmation Modal */}
      {showClearConfirm && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowClearConfirm(false)}>
              <div className="bg-white dark:bg-[#18181b] p-6 rounded-2xl border border-black/10 dark:border-white/10 shadow-2xl max-w-sm w-full animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-red-500">warning</span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display">Clear All Data</h3>
                  </div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">This will permanently delete all your notes, transcripts, and history. This action cannot be undone.</p>
                  <div className="flex justify-end gap-3">
                      <button 
                          onClick={() => setShowClearConfirm(false)}
                          className="px-4 py-2 rounded-lg text-sm font-bold text-slate-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={() => {
                              onClearData();
                              setShowClearConfirm(false);
                          }}
                          className="px-4 py-2 rounded-lg text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                      >
                          Clear Everything
                      </button>
                  </div>
              </div>
          </div>
      )}
    </main>
  );
};

export default SettingsView;