import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Mic, X, Navigation2, Loader2, Volume2, MessageSquare, Compass, Utensils, Building2 } from 'lucide-react';
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

  const getDistanceFormatted = (coords: [number, number]) => {
    const origin = userLocation || [4.8005, 6.9830];
    const R = 6371e3;
    const φ1 = origin[0] * Math.PI/180;
    const φ2 = coords[0] * Math.PI/180;
    const Δφ = (coords[0]-origin[0]) * Math.PI/180;
    const Δλ = (coords[1]-origin[1]) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const dist = Math.round(R * c);
    return dist < 1000 ? `${dist}m` : `${(dist/1000).toFixed(1)}km`;
  };

  const isNearbyActive = activeCategory === 'nearby';
  const showResults = (isSearchFocused || isNearbyActive) && searchResults.length > 0;

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
                placeholder={isNearbyActive ? "Search within nearby food & facilities (500m)..." : "To: Search destination..."}
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
              {(searchQuery || isNavigating || selectedLocation || isNearbyActive) && !isListening && (
                <button 
                  onClick={() => {
                    if (isNavigating) {
                      endSession();
                    } else if (searchMode === 'destination') {
                      setSearchQuery('');
                      handleLocationSelect(null as any);
                      if (isNearbyActive && !searchQuery) {
                        setActiveCategory('all');
                      }
                    } else {
                      setSearchQuery('');
                    }
                  }}
                >
                  <X size={16} className="text-rsu-muted hover:text-rsu-text" />
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

      {/* Search Results / Nearby Overlay */}
      <AnimatePresence>
        {showResults && (
          <motion.div 
            initial={{ height: 0, opacity: 0, scale: 0.98 }}
            animate={{ height: 'auto', opacity: 1, scale: 1 }}
            exit={{ height: 0, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl mt-2 bg-rsu-card rounded-2xl shadow-2xl border border-rsu-border overflow-hidden max-h-72 overflow-y-auto no-scrollbar"
          >
            {isNearbyActive && (
              <div className="px-4 py-2 bg-emerald-500/10 dark:bg-emerald-950/40 border-b border-emerald-500/20 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  <Compass size={14} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Nearby Food & Facilities within 500m ({searchResults.length})</span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-600/80 dark:text-emerald-400/80">
                  {userLocation ? "From your GPS location" : "From campus center"}
                </span>
              </div>
            )}

            {searchResults.map((loc, idx) => {
              const isItemHighlighted = highlightedLocationId === loc.id;
              const distString = getDistanceFormatted(loc.coordinates);
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
                    "p-2 rounded-lg mr-3 transition-colors shrink-0",
                    isItemHighlighted 
                      ? "bg-emerald-500 text-white shadow-sm" 
                      : isNearbyActive
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
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
                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      {distString}
                    </span>
                    <div className="text-[10px] font-mono uppercase text-rsu-muted tracking-wider hidden sm:inline">
                      {loc.type}
                    </div>
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
          {([
            { id: 'all', label: 'All' },
            { id: 'nearby', label: 'Nearby (500m)', isNearby: true },
            { id: 'food', label: 'Food' },
            { id: 'facility', label: 'Facilities' },
            { id: 'faculty', label: 'Faculty' },
            { id: 'college', label: 'College' },
            { id: 'department', label: 'Departments' },
            { id: 'admin', label: 'Admin' },
            { id: 'library', label: 'Library' },
            { id: 'gate', label: 'Gates' }
          ] as const).map(cat => {
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  if (cat.id === 'nearby') {
                    setIsSearchFocused(true);
                  }
                }}
                className={cn(
                  "whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm border flex items-center gap-1.5 cursor-pointer",
                  isSelected
                    ? "bg-rsu-navy text-white border-rsu-navy shadow-md ring-2 ring-rsu-orange/20" 
                    : "bg-rsu-card text-rsu-muted border-rsu-border hover:border-rsu-navy hover:text-rsu-text"
                )}
              >
                {cat.id === 'nearby' && (
                  <Compass size={13} className={cn(isSelected ? "text-rsu-orange" : "text-rsu-muted")} />
                )}
                {cat.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

