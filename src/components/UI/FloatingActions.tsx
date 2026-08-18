import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Layers, 
  LocateFixed, 
  BookOpen, 
  Calendar, 
  MapPin, 
  Sparkles,
  Compass,
  Navigation
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface FloatingActionsProps {
  isSatelliteView: boolean;
  setIsSatelliteView: (s: boolean) => void;
  setNotification: (n: { message: string, type: 'info' | 'error' | 'success' }) => void;
  handleLocateMe: () => void;
  isFollowingUser: boolean;
  toggleEvents: () => void;
  toggleTimetable: () => void;
  isSignedIn: boolean;
  onAddLocationClick: () => void;
  isLocating: boolean;
  hasActiveSelection?: boolean;
  isPanelExpanded?: boolean;
  isTimetableOpen?: boolean;
  isEventsPanelOpen?: boolean;
  isChatOpen?: boolean;
  onToggleChat?: () => void;
}

export const FloatingActions: React.FC<FloatingActionsProps> = ({
  isSatelliteView,
  setIsSatelliteView,
  setNotification,
  handleLocateMe,
  isFollowingUser,
  toggleEvents,
  toggleTimetable,
  isSignedIn,
  onAddLocationClick,
  isLocating,
  hasActiveSelection = false,
  isPanelExpanded = false,
  isTimetableOpen = false,
  isEventsPanelOpen = false,
  isChatOpen = false,
  onToggleChat
}) => {
  return (
    <motion.nav
      initial={{ y: 40, opacity: 0, scale: 0.95 }}
      animate={{ 
        y: isPanelExpanded ? 60 : 0, 
        opacity: isPanelExpanded ? 0 : 1, 
        scale: isPanelExpanded ? 0.9 : 1,
        pointerEvents: isPanelExpanded ? 'none' : 'auto'
      }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "fixed z-30 left-1/2 -translate-x-1/2 transition-all duration-300",
        // Responsive positioning based on bottom sheet state
        hasActiveSelection 
          ? "bottom-[195px] md:bottom-6" 
          : "bottom-4 sm:bottom-6",
        // Shift slightly on desktop if sidebar panels are open
        (isTimetableOpen || isEventsPanelOpen) && "md:left-[calc(50%-200px)]"
      )}
      aria-label="Campus Navigation Bar"
    >
      <div className="flex items-center gap-1 sm:gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-2xl sm:rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.28)] ring-1 ring-black/5 dark:ring-white/10">
        
        {/* GPS Locate Me Button */}
        <button
          onClick={handleLocateMe}
          className={cn(
            "relative group flex flex-col items-center justify-center p-2.5 sm:px-3 sm:py-2 rounded-xl sm:rounded-full transition-all duration-200 cursor-pointer min-w-[44px] min-h-[44px]",
            isFollowingUser
              ? "bg-rsu-navy text-white shadow-md ring-2 ring-rsu-navy/20 dark:bg-emerald-600 dark:ring-emerald-500/30"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
          )}
          title={isFollowingUser ? "Live GPS Tracking Active" : "Center on My Location"}
          aria-label="Locate me"
        >
          {isFollowingUser && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          )}
          <LocateFixed size={20} className={cn(isFollowingUser && "animate-pulse")} />
          <span className="text-[9px] font-bold tracking-tight hidden md:inline-block mt-0.5">
            {isFollowingUser ? "Live GPS" : "Locate"}
          </span>
        </button>

        {/* Map / Satellite Layer Switcher */}
        <button
          onClick={() => {
            const nextMode = !isSatelliteView;
            setIsSatelliteView(nextMode);
            setNotification({ 
              message: `Switched to ${nextMode ? 'Satellite' : 'Map'} View`, 
              type: 'info' 
            });
          }}
          className={cn(
            "flex flex-col items-center justify-center p-2.5 sm:px-3 sm:py-2 rounded-xl sm:rounded-full transition-all duration-200 cursor-pointer min-w-[44px] min-h-[44px]",
            isSatelliteView
              ? "bg-[#4285F4] text-white shadow-md"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
          )}
          title={isSatelliteView ? "Switch to 2D Map View" : "Switch to Satellite Imagery"}
          aria-label="Toggle map layer"
        >
          <Layers size={20} className={cn(isSatelliteView && "animate-pulse")} />
          <span className="text-[9px] font-bold tracking-tight hidden md:inline-block mt-0.5">
            {isSatelliteView ? "Satellite" : "Layers"}
          </span>
        </button>

        {/* Subtle Divider */}
        <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800 mx-0.5 sm:mx-1" />

        {/* Timetable Sync Hub */}
        <button
          onClick={toggleTimetable}
          className={cn(
            "flex flex-col items-center justify-center p-2.5 sm:px-3 sm:py-2 rounded-xl sm:rounded-full transition-all duration-200 cursor-pointer min-w-[44px] min-h-[44px]",
            isTimetableOpen
              ? "bg-rsu-orange text-white shadow-md"
              : "text-slate-600 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-rsu-orange"
          )}
          title="Smart Academic Timetable"
          aria-label="Timetable hub"
        >
          <BookOpen size={20} />
          <span className="text-[9px] font-bold tracking-tight hidden md:inline-block mt-0.5">
            Timetable
          </span>
        </button>

        {/* Campus Events */}
        <button
          onClick={toggleEvents}
          className={cn(
            "flex flex-col items-center justify-center p-2.5 sm:px-3 sm:py-2 rounded-xl sm:rounded-full transition-all duration-200 cursor-pointer min-w-[44px] min-h-[44px]",
            isEventsPanelOpen
              ? "bg-purple-600 text-white shadow-md"
              : "text-slate-600 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:text-purple-600 dark:hover:text-purple-400"
          )}
          title="Campus Events & Schedules"
          aria-label="Events hub"
        >
          <Calendar size={20} />
          <span className="text-[9px] font-bold tracking-tight hidden md:inline-block mt-0.5">
            Events
          </span>
        </button>

        {/* AI Campus Assistant */}
        {onToggleChat && (
          <button
            onClick={onToggleChat}
            className={cn(
              "flex flex-col items-center justify-center p-2.5 sm:px-3 sm:py-2 rounded-xl sm:rounded-full transition-all duration-200 cursor-pointer min-w-[44px] min-h-[44px]",
              isChatOpen
                ? "bg-emerald-600 text-white shadow-md"
                : "text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 dark:hover:text-emerald-400"
            )}
            title="RSU AI Assistant"
            aria-label="AI Campus Guide"
          >
            <Sparkles size={20} className={cn(isChatOpen && "animate-spin")} />
            <span className="text-[9px] font-bold tracking-tight hidden md:inline-block mt-0.5">
              Assistant
            </span>
          </button>
        )}

        {/* Add Location (for authenticated users/contributors) */}
        {isSignedIn && (
          <>
            <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800 mx-0.5 sm:mx-1" />
            <button
              onClick={onAddLocationClick}
              disabled={isLocating}
              className={cn(
                "flex flex-col items-center justify-center p-2.5 sm:px-3 sm:py-2 rounded-xl sm:rounded-full transition-all duration-200 cursor-pointer min-w-[44px] min-h-[44px]",
                isLocating 
                  ? "bg-slate-200 dark:bg-slate-800 text-slate-400 animate-pulse"
                  : "bg-sky-500 text-white hover:bg-sky-600 shadow-md"
              )}
              title="Add Custom Landmark (Checks GPS)"
              id="add-custom-location-btn"
              aria-label="Add location"
            >
              <MapPin size={20} className={cn(isLocating && "animate-spin")} />
              <span className="text-[9px] font-bold tracking-tight hidden md:inline-block mt-0.5">
                {isLocating ? "Locating..." : "Add Point"}
              </span>
            </button>
          </>
        )}

      </div>
    </motion.nav>
  );
};
