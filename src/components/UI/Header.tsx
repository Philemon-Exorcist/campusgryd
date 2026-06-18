import React from 'react';
import { Menu, GraduationCap, Volume2, Sun, Moon, Home } from 'lucide-react';
import { cn } from '../../lib/utils';

interface HeaderProps {
  isVoiceAssistEnabled: boolean;
  isDarkMode: boolean;
  setIsMenuOpen: (o: boolean) => void;
  setIsVoiceAssistEnabled: (e: boolean) => void;
  setIsDarkMode: (d: boolean) => void;
  onNavigateHome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isVoiceAssistEnabled,
  isDarkMode,
  setIsMenuOpen,
  setIsVoiceAssistEnabled,
  setIsDarkMode,
  onNavigateHome
}) => {
  return (
    <header className="absolute top-0 left-0 right-0 z-20 bg-rsu-card/95 backdrop-blur-xl border-b border-rsu-border/20 px-3 py-3 sm:px-4 sm:py-4 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={() => setIsMenuOpen(true)}
          className="p-2 sm:p-2.5 bg-rsu-navy text-white rounded-xl hover:bg-rsu-navy/90 transition-all flex items-center justify-center shadow-lg border border-white/10 active:scale-95"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        
        <div className="flex items-center gap-2 sm:gap-3 text-left">
          <div className="w-8.5 h-8.5 sm:w-10 sm:h-10 bg-gradient-to-br from-rsu-navy to-[#0a2e5c] rounded-xl flex items-center justify-center shadow-md border border-white/20 shrink-0">
            <GraduationCap className="text-white drop-shadow-sm font-bold" size={20} />
          </div>
          <div className="flex flex-col justify-center">
            <h1 
              style={{ color: isDarkMode ? '#FFFFFF' : '#0F172A' }}
              className="text-xs md:text-sm font-display font-black uppercase tracking-tight leading-none"
            >
              <span className="hidden sm:inline">Rivers State University</span>
              <span className="inline sm:hidden">RSU</span>
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5 sm:mt-1">
              <span className="text-[8px] sm:text-[9px] font-bold text-white bg-rsu-orange px-1.2 py-0.5 rounded uppercase tracking-wider">
                CampusGryd
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 md:gap-4">
        {/* Dedicated prominent Go to Homepage Button */}
        <button
          onClick={onNavigateHome}
          className="hidden md:flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-rsu-navy to-[#0a2e5c] hover:from-emerald-600 hover:to-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 cursor-pointer border border-white/10 group"
          title="Go to Homepage"
        >
          <Home size={15} className="text-emerald-400 group-hover:text-white transition-colors" />
          <span className="hidden xs:inline">Home</span>
        </button>

        <div className="text-right hidden md:flex flex-col items-end">
          <p className="text-[10px] font-mono font-black text-rsu-navy dark:text-rsu-green uppercase tracking-widest leading-none">
            Philemon Progress
          </p>
          <p className="text-[8px] font-bold text-rsu-muted uppercase mt-0.5">System Architect</p>
        </div>
        
        <button
          onClick={() => setIsVoiceAssistEnabled(!isVoiceAssistEnabled)}
          className={cn(
            "p-2 sm:p-2.5 rounded-xl transition-all flex items-center justify-center shadow-inner border cursor-pointer",
            isVoiceAssistEnabled ? "bg-rsu-green/10 text-rsu-green border-rsu-green/20" : "bg-rsu-bg text-rsu-muted border-rsu-border"
          )}
          aria-label="Toggle voice assist"
          title={isVoiceAssistEnabled ? "Voice Assist On" : "Voice Assist Off"}
        >
          {isVoiceAssistEnabled ? <Volume2 size={18} /> : <Volume2 size={18} className="opacity-30" />}
        </button>
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={cn(
            "p-2 sm:p-2.5 bg-rsu-bg rounded-xl transition-all flex items-center justify-center shadow-inner border cursor-pointer",
            isDarkMode 
              ? "text-white border-white/20 hover:bg-white/10" 
              : "text-rsu-navy border-rsu-navy/10 hover:bg-rsu-navy/10"
          )}
          aria-label="Toggle dark mode"
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
};
