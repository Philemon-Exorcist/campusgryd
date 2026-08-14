import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Mic, X, Navigation2, Loader2, Volume2, MessageSquare } from 'lucide-react';
import { Location } from '../../types';
import { cn } from '../../lib/utils';

interface SearchOverlayProps {
  isNavigating: boolean;
  searchQuery: string;
  selectedLocation: Location | null;
  startLocation: Location | null;
  userLocation: [number, number] | null;
  isListening: boolean;
  isSearchFocused: boolean;
  searchMode: 'destination' | 'start';
  searchResults: Location[];
  activeCategory: string;
  isSpeaking: boolean;
  setSearchQuery: (q: string) => void;
  setSearchMode: (m: 'destination' | 'start') => void;
  setIsSearchFocused: (f: boolean) => void;
  startListening: () => void;
  endSession: () => void;
  handleLocationSelect: (loc: Location) => void;
  handleGetDirections: () => void;
  setActiveCategory: (cat: any) => void;
  getCategoryIcon: (type: string) => React.ReactNode;
  onToggleChat: () => void;
  highlightedLocationId?: string | null;
  onHighlightLocation?: (id: string | null) => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({
  isNavigating,
  searchQuery,
  selectedLocation,
  startLocation,
  userLocation,
  isListening,
  isSearchFocused,
  searchMode,
  searchResults,
  activeCategory,
  isSpeaking,
  setSearchQuery,
  setSearchMode,
  setIsSearchFocused,
  startListening,
  endSession,
  handleLocationSelect,
  handleGetDirections,
  setActiveCategory,
  getCategoryIcon,
  onToggleChat,
  highlightedLocationId,
  onHighlightLocation
}) => {
  const showStartPoint = !!selectedLocation || !!startLocation || isNavigating || (isSearchFocused && searchMode === 'start');

  return (
    <div className="absolute top-[68px] sm:top-24 left-0 right-0 px-3 sm:px-4 z-10 flex flex-col items-center">
      <div className="w-full max-w-2xl flex flex-col gap-1.5">
        <div className="flex-1 flex flex-col gap-1.5">
          {/* Start Point Search */}
          {showStartPoint && (
            <div className={cn(
              "bg-rsu-card rounded-xl shadow-md border transition-all duration-300",
              searchMode === 'start' ? "border-rsu-orange ring-2 ring-rsu-orange/20" : "border-rsu-border"
            )}>
              <div className="flex items-center px-4 py-2.5">
                <div className="mr-3 flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full border-2 border-rsu-orange bg-white" />
                </div>
                <input 
                  type="text"
                  placeholder="From: Your Location"
                  className="flex-1 outline-none bg-transparent text-[11px] font-bold text-rsu-text placeholder:text-rsu-muted uppercase tracking-tighter"
                  value={searchMode === 'start' ? searchQuery : (startLocation?.officialName || (userLocation ? "My GPS Location" : ""))}
                  onFocus={() => {
                    setIsSearchFocused(true);
                    setSearchMode('start');
                    setSearchQuery('');
                  }}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchMode('start');
                  }}
                />
                {startLocation && (
                  <button onClick={() => handleLocationSelect(null as any)}>
                    <X size={14} className="text-rsu-muted" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Destination Search */}
          <div className={cn(
            "bg-rsu-card rounded-xl shadow-md border transition-all duration-300",
            searchMode === 'destination' ? "border-rsu-orange ring-2 ring-rsu-orange/20" : "border-rsu-border"
          )}>
            <div className="flex items-center px-4 py-2.5">
              <button 
                onClick={(e) => { e.stopPropagation(); onToggleChat(); }}
                className="mr-3 p-1.5 bg-rsu-navy text-white rounded-lg hover:bg-rsu-orange transition-colors relative group"
                title="Open AI Assistant"
              >
                <MessageSquare size={16} className="group-hover:scale-110 transition-transform" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rsu-orange rounded-full border border-white" />
              </button>
              <input 
                type="text"
                placeholder="To: Search destination..."
                className="flex-1 outline-none bg-transparent text-[11px] font-bold text-rsu-text placeholder:text-rsu-muted uppercase tracking-tighter"
                value={searchMode === 'destination' ? searchQuery : (selectedLocation?.officialName || "")}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchMode('destination');
                }}
                onFocus={() => {
                  setIsSearchFocused(true);
                  setSearchMode('destination');
                }}
                readOnly={isNavigating}
              />
              {!isNavigating && (
                <button 
                  onClick={startListening}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors mr-1 active:scale-95 flex items-center justify-center",
                    isListening 
                      ? "bg-rsu-red text-white animate-pulse" 
                      : "bg-rsu-navy text-white hover:bg-rsu-orange"
                  )}
                  title="Voice Search"
                >
                  <Mic size={16} />
                </button>
              )}
              {(searchQuery || isNavigating || selectedLocation) && !isListening && (
                <button 
                  onClick={() => {
                    if (isNavigating) {
                      endSession();
                    } else if (searchMode === 'destination') {
                      setSearchQuery('');
                      handleLocationSelect(null as any);
                    } else {
                      setSearchQuery('');
                    }
                  }}
                >
                  <X size={16} className="text-rsu-muted" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {isNavigating && (
            <button
              onClick={() => handleGetDirections()}
              className={cn(
                "p-3 bg-rsu-green rounded-2xl shadow-xl text-white hover:bg-opacity-90 transition-all flex items-center justify-center h-[52px] w-[52px]",
                isSpeaking && "animate-pulse"
              )}
              aria-label="Play voice directions"
            >
              {isSpeaking ? <Loader2 className="animate-spin" size={20} /> : <Volume2 size={20} />}
            </button>
          )}
        </div>
      </div>

      {/* Search Results */}
      <AnimatePresence>
        {isSearchFocused && searchResults.length > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0, scale: 0.98 }}
            animate={{ height: 'auto', opacity: 1, scale: 1 }}
            exit={{ height: 0, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl mt-2 bg-rsu-card rounded-2xl shadow-2xl border border-rsu-border overflow-hidden max-h-64 overflow-y-auto no-scrollbar"
          >
            {searchResults.map((loc, idx) => {
              const isItemHighlighted = highlightedLocationId === loc.id;
              return (
                <motion.button
                  key={loc.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.18, delay: Math.min(idx * 0.025, 0.2) }}
                  whileHover={{ scale: 1.005 }}
                  whileTap={{ scale: 0.99 }}
                  onMouseEnter={() => onHighlightLocation?.(loc.id)}
                  onMouseLeave={() => onHighlightLocation?.(null)}
                  onFocus={() => onHighlightLocation?.(loc.id)}
                  onBlur={() => onHighlightLocation?.(null)}
                  className={cn(
                    "w-full flex items-center px-4 py-3 text-left transition-colors border-b border-rsu-border last:border-0",
                    isItemHighlighted ? "bg-rsu-navy/10 dark:bg-slate-800/80" : "hover:bg-rsu-bg dark:hover:bg-slate-800/40"
                  )}
                  onClick={() => {
                    onHighlightLocation?.(null);
                    handleLocationSelect(loc);
                  }}
                >
                  <div className={cn(
                    "p-2 rounded-lg mr-3 transition-colors",
                    isItemHighlighted 
                      ? "bg-emerald-500 text-white shadow-sm" 
                      : "bg-rsu-bg text-rsu-green dark:bg-slate-800 dark:text-emerald-400"
                  )}>
                    {getCategoryIcon(loc.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-rsu-text leading-tight truncate">{loc.officialName}</div>
                    <div className="text-xs text-rsu-muted mt-0.5 truncate">
                      {loc.aliases.join(', ') || loc.type}
                    </div>
                  </div>
                  <div className="text-[10px] font-mono uppercase text-rsu-muted tracking-wider ml-2 shrink-0">
                    {loc.type}
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Filters */}
      {!isNavigating && (
        <div className="w-full max-w-md mt-2.5 flex gap-1.5 overflow-x-auto pb-1.5 no-scrollbar px-2.5 sm:px-4">
          {(['all', 'faculty', 'college', 'department', 'admin', 'library', 'gate', 'facility'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm border",
                activeCategory === cat 
                  ? "bg-rsu-navy text-white border-rsu-navy" 
                  : "bg-rsu-card text-rsu-muted border-rsu-border hover:border-rsu-navy"
              )}
            >
              {cat === 'department' ? 'Departments' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
