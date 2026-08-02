import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Map, 
  Calendar, 
  Search, 
  Navigation, 
  Compass, 
  Sparkles, 
  Clock, 
  ChevronRight, 
  Moon, 
  Sun, 
  MapPin, 
  BookOpen, 
  MessageSquare, 
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  TrendingUp,
  Bookmark,
  X,
  Footprints,
  HelpCircle,
  Layers,
  Briefcase,
  ExternalLink,
  GraduationCap,
  Zap,
  Award,
  Users,
  School,
  Route,
  Flame,
  Check
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import { createCustomIcon } from '../../lib/icons';
import { locations } from '../../data/locations';
import { Location, LocationType } from '../../types';
import { cn } from '../../lib/utils';

interface LandingPageProps {
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  onNavigateToMap: (initialLocation?: Location | null, openTimetable?: boolean, openEvents?: boolean) => void;
}

// Interactive simulated waypoint steps
interface SimStep {
  name: string;
  duration: string;
  distance: string;
  instruction: string;
  markerId: string;
}

const SIM_COORDS: Record<string, [number, number]> = {
  gate: [4.804043, 6.986824],
  chapel: [4.799828, 6.984681],
  center: [4.801372, 6.982447],
  senate: [4.799501, 6.982339]
};

const walkerIcon = typeof window !== 'undefined' ? L.divIcon({
  className: 'walker-marker-highlight',
  html: `
    <div class="relative flex items-center justify-center w-8 h-8">
      <div class="absolute w-12 h-12 bg-blue-500/20 rounded-full animate-ping" style="animation-duration: 2s;"></div>
      <div class="absolute w-8 h-8 bg-blue-500 rounded-full border border-white flex items-center justify-center shadow-md">
        <svg viewBox="0 0 24 24" class="w-3.5 h-3.5 fill-white animate-pulse" xmlns="http://www.w3.org/2000/svg">
          <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 21.5c-.1.5.3 1 1 1h.5c.4 0 .8-.3.9-.7l2.1-7.3 2.1 3.5c.3.5.8.8 1.4.8h1.5l-3.3-5.5.9-4.3c1.2 1.4 3 2.2 4.9 2.2V10c-1.5 0-2.9-.8-3.7-2.1L13 6.3c-.4-.6-1.1-1-1.8-1-.3 0-.5.1-.8.2L6 7.2V11h2V8.9l1.8-.7"/>
        </svg>
      </div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
}) : null;

const SIM_ROUTE: SimStep[] = [
  {
    name: "Main Gateway Entry",
    duration: "Start",
    distance: "0m",
    instruction: "Pass through the modern RSU Main Gate and proceed southwest.",
    markerId: "gate"
  },
  {
    name: "Chapel of Redemption Corner",
    duration: "1.8 mins",
    distance: "210m",
    instruction: "Continue straight on the main paved boulevard, passing the Chapel on your left.",
    markerId: "chapel"
  },
  {
    name: "Entrepreneurship Center",
    duration: "3.2 mins",
    distance: "390m",
    instruction: "Turn right at the Risi Water Center crossing and follow the direct pedestrian path.",
    markerId: "center"
  },
  {
    name: "New Senate Building Plaza",
    duration: "4.1 mins",
    distance: "530m",
    instruction: "Arrive safely at the administrative main plaza entrance.",
    markerId: "senate"
  }
];

export function LandingPage({ isDarkMode, setIsDarkMode, onNavigateToMap }: LandingPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  
  // Custom states for interactive features
  const [activeTab, setActiveTab] = useState<'all' | 'faculty' | 'admin' | 'facility' | 'gate'>('all');
  const [simStepIdx, setSimStepIdx] = useState(0);
  const [isSimulating, setIsSimulating] = useState(true);
  const [simProgress, setSimProgress] = useState(0);
  const [panelMode, setPanelMode] = useState<'map' | 'schedule' | 'assistant' | 'calculator'>('map');
  const [manualOverride, setManualOverride] = useState(false);

  // Quick Walk Time Estimator Widget State
  const [calcStartId, setCalcStartId] = useState<string>('main_gate');
  const [calcEndId, setCalcEndId] = useState<string>('senate_building');

  // FAQ accordion active state
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  // Auto alternation between preview modes if user hasn't interacted
  useEffect(() => {
    if (manualOverride) return;
    const rotateInterval = setInterval(() => {
      setPanelMode((prev) => {
        if (prev === 'map') return 'schedule';
        if (prev === 'schedule') return 'assistant';
        if (prev === 'assistant') return 'calculator';
        return 'map';
      });
    }, 8000); // alternating every 8 seconds
    return () => clearInterval(rotateInterval);
  }, [manualOverride]);

  // Simulated live route progression
  useEffect(() => {
    let intervalId: any;
    if (isSimulating && panelMode === 'map') {
      intervalId = setInterval(() => {
        setSimProgress((prev) => {
          if (prev >= 100) {
            setSimStepIdx((curIdx) => (curIdx + 1) % SIM_ROUTE.length);
            return 0;
          }
          return prev + 5;
        });
      }, 150);
    } else {
      setSimProgress(0);
    }
    return () => clearInterval(intervalId);
  }, [isSimulating, panelMode]);

  // Handle live search
  const filteredSearch = searchQuery.trim()
    ? locations.filter(loc => 
        loc.officialName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.aliases.some(alias => alias.toLowerCase().includes(searchQuery.toLowerCase())) ||
        loc.type.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5)
    : [];

  const handleSearchResultClick = (loc: Location) => {
    onNavigateToMap(loc);
  };

  // Trending locations specifically in RSU coordinates
  const popularLocations = locations.slice(0, 6);

  // Grouped location categories for the landing page registry explorer
  const categoryFilteredLocations = (() => {
    const filtered = locations.filter(loc => loc.id !== 'catholic_church');
    const deeperLifeLoc = filtered.find(loc => loc.id === 'deeper_life');
    const others = filtered.filter(loc => loc.id !== 'deeper_life');
    
    const reshuffled = deeperLifeLoc ? [deeperLifeLoc, ...others] : others;

    return reshuffled.filter(loc => {
      if (activeTab === 'all') return true;
      return loc.type === activeTab;
    }).slice(0, 6);
  })();

  const currentCoords = SIM_COORDS[SIM_ROUTE[simStepIdx].markerId] || SIM_COORDS.gate;
  const nextCoords = SIM_COORDS[SIM_ROUTE[(simStepIdx + 1) % SIM_ROUTE.length].markerId] || SIM_COORDS.chapel;
  const fillFrac = simProgress / 100;
  
  const walkerCoords: [number, number] = [
    currentCoords[0] + (nextCoords[0] - currentCoords[0]) * fillFrac,
    currentCoords[1] + (nextCoords[1] - currentCoords[1]) * fillFrac
  ];

  // Calculate distance & time for mini walk estimator
  const calcStartLoc = locations.find(l => l.id === calcStartId) || locations[0];
  const calcEndLoc = locations.find(l => l.id === calcEndId) || locations[1] || locations[0];
  
  const calculateDistanceMeters = (locA: Location, locB: Location) => {
    if (!locA || !locB) return 350;
    const lat1 = locA.coordinates[0];
    const lon1 = locA.coordinates[1];
    const lat2 = locB.coordinates[0];
    const lon2 = locB.coordinates[1];
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return Math.round(R * c);
  };

  const estimatedMeters = calculateDistanceMeters(calcStartLoc, calcEndLoc);
  const estimatedWalkMins = Math.max(1, Math.ceil(estimatedMeters / 80)); // 80 meters/min walking speed
  const estimatedCalories = Math.round(estimatedWalkMins * 4.2);

  // FAQ contents
  const faqs = [
    {
      q: "How does CampusGryd help Rivers State University (RSU) students?",
      a: "CampusGryd is a dedicated campus navigator designed specifically for RSU students, freshers, faculty, and visitors. It maps official pedestrian pathways between classrooms, administrative offices, libraries, hostels, and chaplaincies, while syncing your lecture timetable to provide 1-click directions to your next class."
    },
    {
      q: "Can I use CampusGryd on my smartphone during lectures?",
      a: "Yes! CampusGryd is built as a fast, responsive Web App optimized for all mobile devices. It features smooth touch gestures, interactive bottom navigation drawers, high-contrast walking directions, and compass controls that adapt as you walk across campus."
    },
    {
      q: "How does the Academic Class Timetable Integration work?",
      a: "You can input or import your course schedule into CampusGryd. The system matches each course's lecture theater or lab venue directly on the RSU geodetic map. When your class time approaches, simply tap 'Trace Path' to view turn-by-turn directions from wherever you are!"
    },
    {
      q: "Are the campus GPS coordinates accurate for RSU?",
      a: "Yes. All location markers and pedestrian lanes in CampusGryd are geocoded based on verified spatial coordinates from the Rivers State University geodetic survey. Major landmarks such as New Senate, Convocation Arena, Law Faculty, Engineering Complex, and Main Gate are mapped with precision."
    },
    {
      q: "What is the Gemini AI Campus Assistant?",
      a: "The integrated AI assistant answers campus questions instantly. You can ask where specific departments are located, how to find clearance centers, or how long it takes to walk from your hostel to the lecture hall."
    }
  ];

  // Helper colors for location types tag
  const getTypeBadge = (type: LocationType) => {
    switch(type) {
      case 'faculty':
        return { label: 'Faculty / Academy', style: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' };
      case 'admin':
        return { label: 'Senate / Admin', style: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
      case 'gate':
        return { label: 'Campus Entrance', style: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' };
      case 'library':
        return { label: 'Library / Resource', style: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' };
      default:
        return { label: 'Facility / Center', style: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
    }
  };

  return (
    <div className={cn(
      "min-h-screen w-full flex flex-col font-sans transition-colors duration-500 overflow-x-hidden selection:bg-blue-500/35 selection:text-white",
      isDarkMode ? "bg-slate-950 text-slate-100" : "bg-[#F8FAFC] text-slate-900"
    )}>
      {/* Background Glow Blobs */}
      <div className="absolute top-0 left-0 w-full h-[800px] overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-blue-600/10 dark:bg-blue-500/5 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-20 right-[-10%] w-[600px] h-[600px] bg-sky-400/10 dark:bg-sky-500/5 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute top-[400px] left-1/3 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px]" />
      </div>

      {/* Header Navigation */}
      <nav className={cn(
        "sticky top-0 z-50 backdrop-blur-xl border-b transition-all duration-300 px-4 sm:px-6 md:px-10 py-3.5 flex items-center justify-between",
        isDarkMode 
          ? "bg-slate-950/85 border-slate-900 shadow-md shadow-slate-950/30" 
          : "bg-white/85 border-slate-200/80 shadow-sm shadow-slate-100/50"
      )}>
        {/* Brand Title */}
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onNavigateToMap()}>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-sky-500 flex items-center justify-center shadow-md shadow-blue-500/25 relative overflow-hidden transition-all duration-300 group-hover:scale-105 shrink-0">
            <GraduationCap className="text-white transform group-hover:rotate-12 transition-transform duration-300" size={20} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base sm:text-lg font-display font-black tracking-tight leading-none uppercase">
                Campus<span className="text-blue-600 dark:text-blue-400">Gryd</span>
              </h1>
              <span className="text-[9px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded uppercase tracking-wider">
                RSU NAV
              </span>
            </div>
            <p className="text-[8px] sm:text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mt-1">
              RIVERS STATE UNIVERSITY
            </p>
          </div>
        </div>

        {/* Desktop Quick Nav Links */}
        <div className="hidden lg:flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
          <button 
            onClick={() => onNavigateToMap()} 
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Map size={14} className="text-blue-500" />
            Campus Map
          </button>
          <button 
            onClick={() => onNavigateToMap(null, true)} 
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Calendar size={14} className="text-blue-500" />
            Class Timetable
          </button>
          <a 
            href="#landmarks-section" 
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <MapPin size={14} className="text-blue-500" />
            Landmarks
          </a>
          <a 
            href="#walk-estimator-section" 
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Footprints size={14} className="text-blue-500" />
            Walk Estimator
          </a>
          <a 
            href="#faq-section" 
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <HelpCircle size={14} className="text-blue-500" />
            FAQ
          </a>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Switcher Button */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={cn(
              "p-2.5 rounded-xl border transition-all active:scale-95 cursor-pointer shadow-sm flex items-center justify-center",
              isDarkMode 
                ? "bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-850" 
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            )}
            title="Toggle Light/Dark Theme"
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Primary Action CTA */}
          <button
            onClick={() => onNavigateToMap()}
            className={cn(
              "px-4 sm:px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer font-sans border flex items-center gap-2 shrink-0",
              isDarkMode 
                ? "bg-blue-600 hover:bg-blue-500 border-blue-600 text-white shadow-blue-500/10" 
                : "bg-slate-900 hover:bg-slate-800 border-slate-900 text-white shadow-slate-900/10"
            )}
          >
            <Navigation size={14} className="transform rotate-45" />
            <span>Launch Map</span>
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 md:px-10 pt-10 pb-20 max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-center gap-12 z-10">
        
        {/* Left Side Content */}
        <div className="flex-1 space-y-7 text-center lg:text-left">
          
          {/* Announcement Pill */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <Sparkles size={12} className="text-blue-500 shrink-0" />
            RIVERS STATE UNIVERSITY • CAMPUS NAVIGATOR
          </motion.div>
  
          {/* Main Headline */}
          <div className="space-y-4">
            <motion.h2 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-display font-black tracking-tight uppercase leading-[1.06] text-slate-900 dark:text-slate-50"
            >
              Navigate RSU Campus <br />
              <span className="bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-500 bg-clip-text text-transparent dark:from-blue-400 dark:via-sky-400 dark:to-indigo-400">
                Like A Professional.
              </span>
            </motion.h2>

            <motion.p 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className={cn(
                "text-sm sm:text-base max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium transition-colors",
                isDarkMode ? "text-slate-350" : "text-slate-600"
              )}
            >
              Effortlessly locate lecture halls, continuous assessment venues, senate offices, and chaplaincies. Built with verified RSU pedestrian coordinates, course timetable sync, and instant AI guidance for every student.
            </motion.p>
          </div>

          {/* Quick Search HUD Input */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative max-w-lg mx-auto lg:mx-0 z-40"
          >
            <div className={cn(
              "flex items-center p-2.5 border rounded-2xl transition-all shadow-md group relative backdrop-blur-md",
              isDarkMode 
                ? "bg-slate-900/80 border-slate-800 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10" 
                : "bg-white border-slate-200 focus-within:border-slate-800 focus-within:ring-4 focus-within:ring-slate-900/5 shadow-slate-100"
            )}>
              <Search className="text-slate-400 ml-3.5 shrink-0" size={18} />
              <input 
                type="text"
                placeholder="Search New Senate, Law Faculty, Main Library..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowResults(true);
                }}
                onFocus={() => setShowResults(true)}
                className="w-full bg-transparent px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none placeholder-slate-400 font-semibold"
              />
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold mr-1 uppercase select-none shrink-0">
                ⌘K Discover
              </span>
              {searchQuery && (
                <button 
                  onClick={() => { setSearchQuery(''); setShowResults(false); }}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors mr-1"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Smart Search Dynamic Suggestions Area */}
            <AnimatePresence>
              {showResults && searchQuery && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className={cn(
                    "absolute top-full left-0 right-0 mt-2 p-3 border rounded-2xl shadow-2xl z-55 text-left max-h-80 overflow-y-auto backdrop-blur-xl transition-all",
                    isDarkMode 
                      ? "bg-slate-950/98 border-slate-800 shadow-slate-950" 
                      : "bg-white/98 border-slate-200 shadow-slate-200"
                  )}
                >
                  {filteredSearch.length > 0 ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between mb-2 px-2">
                        <p className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">RSU CAMPUS MATCHES</p>
                        <span className="text-[8px] font-mono text-emerald-500 font-bold uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded">GPS Ready</span>
                      </div>
                      {filteredSearch.map(loc => {
                        const badgeObj = getTypeBadge(loc.type);
                        return (
                          <button
                            id={`hero-search-res-${loc.id}`}
                            key={loc.id}
                            onClick={() => handleSearchResultClick(loc)}
                            className={cn(
                              "flex items-center justify-between w-full p-2.5 rounded-xl text-left transition-all group cursor-pointer border border-transparent",
                              isDarkMode 
                                ? "hover:bg-slate-900 hover:border-slate-800" 
                                : "hover:bg-slate-50 hover:border-slate-200"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                                <MapPin size={16} />
                              </div>
                              <div className="min-w-0">
                                <p className="font-extrabold text-xs group-hover:text-blue-500 transition-colors truncate uppercase">{loc.officialName}</p>
                                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                  {loc.landmark} • <span className="font-mono text-[9px]">{loc.coordinates[0].toFixed(4)}, {loc.coordinates[1].toFixed(4)}</span>
                                </p>
                              </div>
                            </div>
                            <span className={cn("px-2 py-0.5 text-[8px] rounded font-bold border shrink-0 uppercase tracking-wider ml-2", badgeObj.style)}>
                              {badgeObj.label.split(' / ')[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-5 text-center space-y-2">
                      <HelpCircle className="text-slate-400 mx-auto" size={24} />
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-bold">No location matches found</p>
                      <button 
                        onClick={() => onNavigateToMap()}
                        className="text-[10px] font-mono font-bold text-blue-500 uppercase hover:underline"
                      >
                        Search all campus nodes on map &rarr;
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Key Call to Action buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 pt-1"
          >
            {/* Find Path Primary */}
            <button
              onClick={() => onNavigateToMap()}
              className={cn(
                "px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2.5 shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-95 cursor-pointer group border leading-none",
                isDarkMode 
                  ? "bg-blue-600 border-blue-600 hover:bg-blue-500 text-white shadow-blue-500/15" 
                  : "bg-slate-900 border-slate-900 hover:bg-slate-800 text-white shadow-slate-900/15"
              )}
            >
              <Navigation className="transform rotate-45 shrink-0 transition-transform group-hover:translate-x-0.5" size={15} />
              Launch Live Map
            </button>

            {/* Calendar Timetable Secondary */}
            <button
              onClick={() => onNavigateToMap(null, true)}
              className={cn(
                "px-6 py-3.5 border rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2.5 active:scale-95 transition-all duration-300 leading-none shadow-sm",
                isDarkMode 
                  ? "bg-slate-900/60 border-slate-800 hover:bg-slate-900 text-slate-100" 
                  : "bg-white border-slate-200 hover:bg-slate-50 text-slate-900"
              )}
            >
              <Calendar size={15} className="text-blue-500" />
              Sync Class Schedule
            </button>
          </motion.div>

          {/* Quick Student Landmark Chips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-2 text-xs"
          >
            <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mr-1 flex items-center gap-1">
              <TrendingUp size={11} className="text-blue-500" />
              POPULAR NODES:
            </span>
            {popularLocations.map(loc => (
              <button
                key={loc.id}
                onClick={() => onNavigateToMap(loc)}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg border text-[10px] font-bold tracking-tight transition-all hover:border-blue-500 hover:text-blue-500 cursor-pointer active:scale-95",
                  isDarkMode 
                    ? "bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-900" 
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                )}
              >
                {loc.officialName.split(' - ')[0]}
              </button>
            ))}
          </motion.div>
        </div>

        {/* Right Side Visual Interactive Demo Box */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="flex-1 w-full max-w-lg lg:max-w-none relative rounded-3xl overflow-hidden border shadow-2xl bg-slate-900 dark:bg-slate-950 border-slate-800 flex flex-col justify-between"
        >
          {/* Simulation Header Overlays */}
          <div className="p-3.5 bg-slate-950/90 z-20 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-wider">
                RSU NAV TERMINAL PREVIEW
              </span>
            </div>
            
            {/* Mode Selector Tabs */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {(['map', 'schedule', 'assistant', 'calculator'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPanelMode(mode);
                    setManualOverride(true);
                  }}
                  className={cn(
                    "px-2 py-1 rounded-lg text-[8px] font-mono font-bold uppercase transition-all tracking-wider",
                    panelMode === mode ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                  )}
                >
                  {mode === 'map' ? 'Walk Map' : mode === 'schedule' ? 'Timetable' : mode === 'assistant' ? 'AI Guide' : 'Estimator'}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Route Presentation Area */}
          <div className="w-full h-96 min-h-[384px] bg-slate-950 relative select-none overflow-hidden">
            <AnimatePresence mode="wait">
              {panelMode === 'map' && (
                <motion.div
                  key="map-simulation"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 p-4 flex flex-col justify-between"
                >
                  {/* Real Leaflet Map Simulation */}
                  {typeof window !== 'undefined' && (
                    <MapContainer
                      center={[4.8015, 6.9840]}
                      zoom={15}
                      zoomControl={false}
                      className="absolute inset-0 w-full h-full z-0 opacity-85"
                      dragging={false}
                      scrollWheelZoom={false}
                      doubleClickZoom={false}
                      touchZoom={false}
                    >
                      <TileLayer
                        url={isDarkMode 
                          ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
                          : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        }
                      />
                      
                      <Polyline 
                        positions={Object.values(SIM_COORDS)}
                        color="#3b82f6" 
                        weight={4}
                        dashArray="5, 8"
                        opacity={0.8}
                      />

                      {Object.entries(SIM_COORDS).map(([id, coords]) => {
                        const step = SIM_ROUTE.find(s => s.markerId === id);
                        return (
                          <Marker 
                            key={id} 
                            position={coords} 
                            icon={createCustomIcon(id === 'gate' ? 'gate' : id === 'senate' ? 'admin' : 'facility', simStepIdx === SIM_ROUTE.findIndex(s => s.markerId === id))}
                          >
                            <Popup className="rsu-popup">
                              <div className="p-2">
                                <h4 className="font-bold uppercase text-xs text-rsu-navy">{step?.name}</h4>
                                <p className="text-[10px] text-slate-500 mt-1">{step?.instruction}</p>
                              </div>
                            </Popup>
                          </Marker>
                        );
                      })}

                      {walkerIcon && <Marker position={walkerCoords} icon={walkerIcon} />}
                    </MapContainer>
                  )}

                  {/* Live Navigation Guidance Box Overlay */}
                  <div className="absolute bottom-4 inset-x-4 mx-auto w-[92%] space-y-2 p-3 bg-slate-950/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl z-20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="p-0.5 px-2 bg-blue-500/10 text-blue-400 rounded text-[8px] font-black uppercase tracking-wider border border-blue-500/20">
                          OSRM HUD PREVIEW
                        </span>
                        <span className="text-[8px] font-mono text-slate-400 font-bold uppercase">LIVE SIM</span>
                      </div>
                      <div className="text-[8px] font-mono text-blue-400 font-bold bg-white/5 px-2 py-0.5 rounded border border-slate-800">
                        WALK ON RSU
                      </div>
                    </div>

                    <div className="min-h-[40px]">
                      <p className="text-[8px] font-mono text-blue-500 font-bold uppercase tracking-wider">
                        STEP {simStepIdx + 1} OF {SIM_ROUTE.length}: {SIM_ROUTE[simStepIdx].name}
                      </p>
                      <h4 className="text-xs font-display font-medium text-white uppercase tracking-tight mt-0.5 leading-tight">
                        {SIM_ROUTE[simStepIdx].instruction}
                      </h4>
                    </div>

                    {/* Numeric Stats Row */}
                    <div className="grid grid-cols-3 gap-2 border-t border-slate-850 pt-2 text-center">
                      <div>
                        <p className="text-[7.5px] font-mono text-slate-400 uppercase font-black">PROGRESS</p>
                        <p className="text-[10px] font-bold text-white mt-0.5">{Math.round(simProgress)}%</p>
                      </div>
                      <div>
                        <p className="text-[7.5px] font-mono text-slate-400 uppercase font-black">WALK TIME</p>
                        <p className="text-[10px] font-bold text-blue-400 mt-0.5">{SIM_ROUTE[simStepIdx].duration}</p>
                      </div>
                      <div>
                        <p className="text-[7.5px] font-mono text-slate-400 uppercase font-black">DISTANCE</p>
                        <p className="text-[10px] font-bold text-white mt-0.5">{SIM_ROUTE[simStepIdx].distance}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {panelMode === 'schedule' && (
                <motion.div
                  key="timetable-simulation"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 p-5 flex flex-col justify-between"
                >
                  <div className="space-y-3 z-10 w-full mt-2">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-blue-400" />
                        <span className="text-[10px] font-mono font-black text-white uppercase tracking-wider">
                          STUDENT CLASS SCHEDULE
                        </span>
                      </div>
                      <span className="text-[8px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded uppercase font-bold border border-emerald-500/20">
                        1-CLICK ROUTE SYNC
                      </span>
                    </div>

                    {/* Schedule List */}
                    <div className="space-y-2">
                      <div className="p-2.5 bg-slate-900/40 border border-slate-850 rounded-xl flex items-center justify-between opacity-60">
                        <div>
                          <p className="text-[7.5px] font-mono text-slate-400 uppercase font-bold">08:00 AM - GST 111</p>
                          <h5 className="text-[11px] font-black text-slate-300 uppercase leading-none mt-0.5">PEACE & CONFLICT STUDIES</h5>
                          <p className="text-[9px] text-slate-400 mt-1">Venue: Convocation Arena</p>
                        </div>
                        <span className="text-emerald-400 font-bold text-xs bg-emerald-500/10 p-1 px-2 rounded">Completed ✓</span>
                      </div>

                      <div className="p-3 bg-blue-950/30 border border-blue-900/50 rounded-xl relative ring-1 ring-blue-500/30">
                        <span className="absolute right-3 top-3 w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                        <div>
                          <p className="text-[8px] font-mono text-blue-400 font-bold uppercase tracking-wider">11:30 AM • ACTIVE CLASS NEXT</p>
                          <h5 className="text-xs font-display font-black text-white uppercase leading-tight mt-0.5">ENG 301 - FLUID MECHANICS LAB</h5>
                          <p className="text-[9.5px] text-slate-300 mt-1 flex items-center gap-1 font-semibold">
                            <MapPin size={10} className="text-blue-400" />
                            Faculty of Engineering • Workshop B
                          </p>
                        </div>

                        <div className="mt-2.5 text-[9px] text-slate-300 font-mono flex items-center justify-between border-t border-blue-900/30 pt-2">
                          <span>Est. Walk: 4 mins from Gate</span>
                          <button
                            onClick={() => onNavigateToMap(null, true)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-mono text-[8px] font-black rounded uppercase tracking-wider flex items-center gap-1 transition-all"
                          >
                            Trace Path 🚶
                          </button>
                        </div>
                      </div>

                      <div className="p-2.5 bg-slate-900/40 border border-slate-850 rounded-xl flex items-center justify-between opacity-80">
                        <div>
                          <p className="text-[7.5px] font-mono text-slate-400 uppercase font-bold">02:30 PM - MTH 211</p>
                          <h5 className="text-[11px] font-black text-slate-300 uppercase leading-none mt-0.5">MATHEMATICAL ANALYSIS II</h5>
                          <p className="text-[9px] text-slate-400 mt-1">Venue: Science Lecture Hall A</p>
                        </div>
                        <span className="text-[8px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">UPCOMING</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {panelMode === 'assistant' && (
                <motion.div
                  key="assistant-simulation"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 p-5 flex flex-col justify-between"
                >
                  <div className="space-y-3 z-10 w-full mt-2">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Sparkles size={14} className="text-purple-400" />
                        <span className="text-[10px] font-mono font-black text-white uppercase tracking-wider">
                          GEMINI AI CAMPUS GUIDE
                        </span>
                      </div>
                      <span className="text-[8px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded uppercase font-bold border border-purple-500/20">
                        INSTANT ANSWERS
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      {/* User Chat Bubble */}
                      <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 self-end max-w-[85%] ml-auto">
                        <p className="text-[9px] font-mono text-purple-400 font-bold">Student:</p>
                        <p className="mt-0.5 font-medium">&ldquo;Where is the New Senate Building for clearance?&rdquo;</p>
                      </div>

                      {/* AI Chat Response Bubble */}
                      <div className="p-3 bg-purple-950/30 border border-purple-900/40 rounded-xl text-slate-100 space-y-2 max-w-[90%]">
                        <p className="text-[9px] font-mono text-purple-400 font-bold flex items-center gap-1">
                          <Sparkles size={10} /> CampusGryd Assistant:
                        </p>
                        <p className="text-[11px] leading-relaxed">
                          The New Senate Building is located along the central administrative plaza, approximately 530m from the Main Gate (a 4-minute walk).
                        </p>
                        <button 
                          onClick={() => onNavigateToMap()}
                          className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white font-mono text-[8px] font-black rounded uppercase tracking-wider inline-flex items-center gap-1"
                        >
                          Navigate to New Senate &rarr;
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {panelMode === 'calculator' && (
                <motion.div
                  key="calculator-simulation"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 p-5 flex flex-col justify-between"
                >
                  <div className="space-y-3 z-10 w-full mt-1">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Footprints size={14} className="text-emerald-400" />
                        <span className="text-[10px] font-mono font-black text-white uppercase tracking-wider">
                          LIVE WALK TIME ESTIMATOR
                        </span>
                      </div>
                      <span className="text-[8px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded uppercase font-bold border border-emerald-500/20">
                        RSU PEDESTRIAN SPEED
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[8px] font-mono text-slate-400 font-bold uppercase">From Landmark:</label>
                          <select 
                            value={calcStartId}
                            onChange={(e) => setCalcStartId(e.target.value)}
                            className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-[10px] font-bold text-white focus:outline-none"
                          >
                            {locations.map(l => (
                              <option key={l.id} value={l.id}>{l.officialName}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[8px] font-mono text-slate-400 font-bold uppercase">To Destination:</label>
                          <select 
                            value={calcEndId}
                            onChange={(e) => setCalcEndId(e.target.value)}
                            className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-[10px] font-bold text-white focus:outline-none"
                          >
                            {locations.map(l => (
                              <option key={l.id} value={l.id}>{l.officialName}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Result Box */}
                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-[7.5px] font-mono text-slate-400 uppercase font-bold">EST. WALK</p>
                            <p className="text-sm font-black text-emerald-400 mt-0.5">{estimatedWalkMins} mins</p>
                          </div>
                          <div>
                            <p className="text-[7.5px] font-mono text-slate-400 uppercase font-bold">DISTANCE</p>
                            <p className="text-sm font-black text-white mt-0.5">{estimatedMeters}m</p>
                          </div>
                          <div>
                            <p className="text-[7.5px] font-mono text-slate-400 uppercase font-bold">CALORIES</p>
                            <p className="text-sm font-black text-amber-400 mt-0.5">{estimatedCalories} kcal</p>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            const startLoc = locations.find(l => l.id === calcStartId);
                            onNavigateToMap(startLoc);
                          }}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[9px] font-black rounded-lg uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all mt-1"
                        >
                          Calculate Direct Route on Map &rarr;
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Floating Info bar */}
          <div className="p-3 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Compass size={14} className="animate-spin" style={{ animationDuration: '6s' }} />
              </div>
              <div>
                <p className="text-[9px] font-black text-white uppercase">Rivers State University Map</p>
                <p className="text-[8px] text-slate-400 leading-none mt-0.5">Verified Geodetic Coordinates & Pedestrian Routes</p>
              </div>
            </div>
            <button 
              onClick={() => onNavigateToMap()}
              className="p-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-mono text-[9px] font-black rounded-lg transition-all active:scale-95"
            >
              ENTER MAP
            </button>
          </div>
        </motion.div>
      </section>

      {/* STUDENT PERSONA SHORTCUTS - TAILORED EXPERIENCE */}
      <section className={cn(
        "py-16 px-4 sm:px-6 md:px-10 border-t transition-colors",
        isDarkMode ? "bg-slate-900/40 border-slate-900" : "bg-slate-100/60 border-slate-200"
      )}>
        <div className="max-w-7xl mx-auto space-y-10">
          
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-[9px] font-mono font-bold tracking-widest text-blue-600 dark:text-blue-400 uppercase bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/15">
              TAILORED FOR EVERY RSU STUDENT
            </span>
            <h3 className="text-2xl sm:text-3xl font-display font-black uppercase tracking-tight text-slate-900 dark:text-slate-50">
              What brings you to campus today?
            </h3>
            <p className={cn(
              "text-xs sm:text-sm font-semibold transition-colors",
              isDarkMode ? "text-slate-400" : "text-slate-600"
            )}>
              Select your persona for quick 1-click directions to your most relevant university destinations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: Freshers */}
            <div 
              onClick={() => onNavigateToMap(locations.find(l => l.id === 'senate_building'))}
              className={cn(
                "p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between space-y-4 cursor-pointer group hover:-translate-y-1 hover:shadow-lg",
                isDarkMode 
                  ? "bg-slate-950 border-slate-850 hover:border-blue-500/50" 
                  : "bg-white border-slate-200 hover:border-blue-500/50 shadow-slate-100"
              )}
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                  <GraduationCap size={20} />
                </div>
                <div>
                  <h4 className="font-display font-extrabold uppercase text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-500 transition-colors">
                    Fresher / New Student
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    First time at RSU? Get direct routes for Admissions, Clearance, Senate, and Library registration.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase text-blue-500 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Fresher Guidance &rarr;
              </span>
            </div>

            {/* Card 2: Undergraduates */}
            <div 
              onClick={() => onNavigateToMap(null, true)}
              className={cn(
                "p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between space-y-4 cursor-pointer group hover:-translate-y-1 hover:shadow-lg",
                isDarkMode 
                  ? "bg-slate-950 border-slate-850 hover:border-blue-500/50" 
                  : "bg-white border-slate-200 hover:border-blue-500/50 shadow-slate-100"
              )}
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h4 className="font-display font-extrabold uppercase text-sm text-slate-900 dark:text-slate-100 group-hover:text-emerald-500 transition-colors">
                    Undergraduate Lectures
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Sync your course timetable, calculate walking time between lectures, and never miss continuous assessment tests.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase text-emerald-500 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Timetable Sync &rarr;
              </span>
            </div>

            {/* Card 3: Science & Labs */}
            <div 
              onClick={() => onNavigateToMap(locations.find(l => l.id === 'eng_faculty'))}
              className={cn(
                "p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between space-y-4 cursor-pointer group hover:-translate-y-1 hover:shadow-lg",
                isDarkMode 
                  ? "bg-slate-950 border-slate-850 hover:border-blue-500/50" 
                  : "bg-white border-slate-200 hover:border-blue-500/50 shadow-slate-100"
              )}
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                  <Zap size={20} />
                </div>
                <div>
                  <h4 className="font-display font-extrabold uppercase text-sm text-slate-900 dark:text-slate-100 group-hover:text-amber-500 transition-colors">
                    Science & Engineering Labs
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Locate engineering workshops, drawing halls, chemistry labs, and computer centers quickly.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase text-amber-500 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Faculty Labs &rarr;
              </span>
            </div>

            {/* Card 4: Postgrad & Admin */}
            <div 
              onClick={() => onNavigateToMap(locations.find(l => l.id === 'pg_school'))}
              className={cn(
                "p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between space-y-4 cursor-pointer group hover:-translate-y-1 hover:shadow-lg",
                isDarkMode 
                  ? "bg-slate-950 border-slate-850 hover:border-blue-500/50" 
                  : "bg-white border-slate-200 hover:border-blue-500/50 shadow-slate-100"
              )}
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
                  <Briefcase size={20} />
                </div>
                <div>
                  <h4 className="font-display font-extrabold uppercase text-sm text-slate-900 dark:text-slate-100 group-hover:text-purple-500 transition-colors">
                    Postgrad & Visitors
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Direct paths to Postgraduate School, Senate Chambers, Convocation Arena, and Chaplaincy halls.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase text-purple-500 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Admin Directory &rarr;
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* RSU Campus Landmark Finder Registry Grid Selector section */}
      <section id="landmarks-section" className={cn(
        "py-18 px-4 sm:px-6 md:px-10 border-t transition-colors",
        isDarkMode ? "bg-slate-950 border-slate-900" : "bg-white border-slate-200/80"
      )}>
        <div className="max-w-7xl mx-auto space-y-10">
          
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2 max-w-xl text-left">
              <span className="text-[9px] font-mono font-bold tracking-widest text-blue-600 dark:text-blue-400 uppercase bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/15">
                CAMPUS LANDMARKS DATABASE
              </span>
              <h3 className="text-2xl sm:text-3xl font-display font-black uppercase tracking-tight text-slate-900 dark:text-slate-50">
                Explore Geocoded Campus Destinations.
              </h3>
              <p className={cn(
                "text-xs sm:text-sm font-semibold transition-colors",
                isDarkMode ? "text-slate-400" : "text-slate-600"
              )}>
                Browse official coordinates collected across Rivers State University. Click any landmark to trigger walking directions on the map.
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 shrink-0 self-start md:self-end">
              {(['all', 'faculty', 'admin', 'facility', 'gate'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all active:scale-95 duration-200 border",
                    activeTab === tab
                      ? isDarkMode ? "bg-blue-600 border-blue-600 text-white font-black shadow-lg" : "bg-slate-900 border-slate-900 text-white font-black shadow-md"
                      : isDarkMode
                        ? "bg-slate-900/60 border-slate-800 hover:bg-slate-850 text-slate-400"
                        : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                  )}
                >
                  {tab === 'all' ? 'All Registry' : tab}
                </button>
              ))}
            </div>
          </div>

          {/* Catalog Grid output */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoryFilteredLocations.map(loc => {
              const badge = getTypeBadge(loc.type);
              const getLocIcon = (t: string) => {
                if (t === 'faculty') return <BookOpen size={14} className="text-blue-500 shrink-0" />;
                if (t === 'admin') return <ShieldCheck size={14} className="text-amber-500 shrink-0" />;
                if (t === 'gate') return <Compass size={14} className="text-rose-500 shrink-0" />;
                return <Layers size={14} className="text-emerald-500 shrink-0" />;
              };
              return (
                <motion.div
                  layout
                  key={loc.id}
                  className={cn(
                    "p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between group h-full space-y-4 hover:-translate-y-1 hover:shadow-xl",
                    isDarkMode 
                      ? "bg-slate-900/40 border-slate-850 hover:bg-slate-900 hover:border-slate-800" 
                      : "bg-white border-slate-200/80 hover:bg-white hover:border-slate-300 shadow-slate-100/50"
                  )}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={cn("px-2.5 py-0.5 text-[8.5px] rounded-md font-bold border uppercase tracking-wider font-mono", badge.style)}>
                        {badge.label.split(' / ')[0]}
                      </span>
                      <div className="flex items-center gap-1.5 opacity-80">
                        {getLocIcon(loc.type)}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-display font-extrabold uppercase leading-snug group-hover:text-blue-500 transition-colors text-slate-900 dark:text-slate-100">
                        {loc.officialName}
                      </h4>
                      <p className={cn(
                        "text-[11px] leading-relaxed mt-2 font-medium transition-colors line-clamp-2",
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      )}>
                        {loc.description || "Official RSU facility mapped natively to the pedestrian navigation grid."}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-850 pt-3 flex items-center justify-between text-[11px] select-none">
                    <div className="flex items-center gap-1.5 text-slate-400 min-w-0 pr-2">
                      <MapPin size={12} className="text-blue-500 shrink-0" />
                      <span className="font-bold text-[10px] truncate">{loc.landmark}</span>
                    </div>
                    <button
                      onClick={() => onNavigateToMap(loc)}
                      className="text-[10px] font-black uppercase tracking-wider text-blue-500 flex items-center gap-1 transition-transform group-hover:translate-x-1 shrink-0 font-sans"
                    >
                      Navigate &rarr;
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Quick Registry Total Label */}
          <div className="text-center pt-2 select-none">
            <p className="text-xs font-mono font-medium text-slate-400">
              Showing <strong className="text-blue-500 font-bold">{categoryFilteredLocations.length}</strong> of <strong className="text-slate-900 dark:text-slate-200 font-bold">{locations.length}</strong> geocoded campus nodes. 
              <button 
                onClick={() => onNavigateToMap()} 
                className="ml-2 hover:text-blue-400 text-blue-500 font-bold uppercase text-[9px] tracking-wider transition-colors hover:underline cursor-pointer"
              >
                Inspect All on Map &rarr;
              </button>
            </p>
          </div>

        </div>
      </section>

      {/* INTERACTIVE WALK TIME ESTIMATOR SECTION */}
      <section id="walk-estimator-section" className={cn(
        "py-16 px-4 sm:px-6 md:px-10 border-t transition-colors",
        isDarkMode ? "bg-slate-900/30 border-slate-900" : "bg-slate-50 border-slate-200/80"
      )}>
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-[9px] font-mono font-bold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/15">
              STUDENT UTILITY WIDGET
            </span>
            <h3 className="text-2xl sm:text-3xl font-display font-black uppercase tracking-tight text-slate-900 dark:text-slate-50">
              Calculate Campus Walk Times
            </h3>
            <p className={cn(
              "text-xs sm:text-sm font-semibold transition-colors",
              isDarkMode ? "text-slate-400" : "text-slate-600"
            )}>
              Estimate how many minutes it takes to walk between any two landmarks before leaving your hostel or lecture hall.
            </p>
          </div>

          <div className={cn(
            "p-6 sm:p-8 rounded-3xl border shadow-xl flex flex-col md:flex-row items-center justify-between gap-8",
            isDarkMode ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200 shadow-slate-100"
          )}>
            <div className="w-full md:w-1/2 space-y-4">
              <div>
                <label className="text-xs font-mono text-slate-400 font-bold uppercase">Starting Location:</label>
                <select 
                  value={calcStartId}
                  onChange={(e) => setCalcStartId(e.target.value)}
                  className="w-full mt-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.officialName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400 font-bold uppercase">Destination Landmark:</label>
                <select 
                  value={calcEndId}
                  onChange={(e) => setCalcEndId(e.target.value)}
                  className="w-full mt-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.officialName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="w-full md:w-1/2 p-5 bg-blue-500/5 border border-blue-500/20 rounded-2xl space-y-4 text-center">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="text-[8px] font-mono text-slate-400 uppercase font-bold">EST. WALK</p>
                  <p className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">{estimatedWalkMins} mins</p>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="text-[8px] font-mono text-slate-400 uppercase font-bold">DISTANCE</p>
                  <p className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">{estimatedMeters}m</p>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="text-[8px] font-mono text-slate-400 uppercase font-bold">CALORIES</p>
                  <p className="text-lg font-black text-amber-500 mt-0.5">{estimatedCalories} kcal</p>
                </div>
              </div>

              <button 
                onClick={() => onNavigateToMap(calcStartLoc)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-black rounded-xl uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                <Navigation size={14} className="transform rotate-45" />
                Launch Live Route On Map &rarr;
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CORE CAPABILITIES - BENTO SHOWCASE */}
      <section className={cn(
        "py-20 px-4 sm:px-6 md:px-10 border-t",
        isDarkMode ? "bg-slate-950 border-slate-900" : "bg-white border-slate-200/80"
      )}>
        <div className="max-w-7xl mx-auto space-y-14">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-[10px] font-black tracking-widest text-blue-500 dark:text-blue-400 bg-blue-500/10 px-3.5 py-1.5 rounded-full border border-blue-500/15">
              CORE CAPABILITIES
            </span>
            <h3 className="text-2xl sm:text-3.5xl font-display font-black uppercase tracking-tight">
              Built Specifically for RSU Students.
            </h3>
            <p className={cn(
              "text-xs sm:text-sm font-semibold transition-colors",
              isDarkMode ? "text-slate-400" : "text-slate-600"
            )}>
              Say goodbye to missing continuous assessment tests, wandering during orientation, or asking passersby for directions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Capability 1 */}
            <div className={cn(
              "p-6 rounded-3xl border shadow-sm flex flex-col justify-between space-y-6 hover:shadow-md transition-all",
              isDarkMode ? "bg-slate-900/30 border-slate-850" : "bg-slate-50 border-slate-200/60"
            )}>
              <div className="space-y-3.5">
                <div className="w-11 h-11 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                  <Compass size={22} />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-base font-display font-black uppercase tracking-tight">
                    Pedestrian Pathfinding
                  </h4>
                  <p className={cn("text-xs leading-relaxed", isDarkMode ? "text-slate-400" : "text-slate-600")}>
                    Walk safely along university lanes, chapel cut-throughs, and administrative plazas away from heavy vehicle traffic.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => onNavigateToMap()}
                className="text-[10px] font-black uppercase text-orange-500 tracking-wider flex items-center gap-1 hover:gap-2 transition-all self-start"
              >
                Open Route Tool &rarr;
              </button>
            </div>

            {/* Capability 2 */}
            <div className={cn(
              "p-6 rounded-3xl border shadow-sm flex flex-col justify-between space-y-6 hover:shadow-md transition-all",
              isDarkMode ? "bg-slate-900/30 border-slate-850" : "bg-slate-50 border-slate-200/60"
            )}>
              <div className="space-y-3.5">
                <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                  <BookOpen size={22} />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-base font-display font-black uppercase tracking-tight">
                    Timetable-to-Map Sync
                  </h4>
                  <p className={cn("text-xs leading-relaxed", isDarkMode ? "text-slate-400" : "text-slate-600")}>
                    Input your lecture timetable once. Click any course block to immediately start turn-by-turn navigation to that exact hall.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => onNavigateToMap(null, true)}
                className="text-[10px] font-black uppercase text-blue-500 tracking-wider flex items-center gap-1 hover:gap-2 transition-all self-start"
              >
                Access Timetable &rarr;
              </button>
            </div>

            {/* Capability 3 */}
            <div className={cn(
              "p-6 rounded-3xl border shadow-sm flex flex-col justify-between space-y-6 hover:shadow-md transition-all",
              isDarkMode ? "bg-slate-900/30 border-slate-850" : "bg-slate-50 border-slate-200/60"
            )}>
              <div className="space-y-3.5">
                <div className="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                  <Sparkles size={22} />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-base font-display font-black uppercase tracking-tight">
                    Gemini AI Campus Assistant
                  </h4>
                  <p className={cn("text-xs leading-relaxed", isDarkMode ? "text-slate-400" : "text-slate-600")}>
                    Ask any question about RSU departments, clearance guidelines, or campus distances and get intelligent instant responses.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => onNavigateToMap()}
                className="text-[10px] font-black uppercase text-purple-500 tracking-wider flex items-center gap-1 hover:gap-2 transition-all self-start"
              >
                Ask Assistant &rarr;
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* RSU Statistics & Geodetic Verification Banner */}
      <section className="px-4 sm:px-6 md:px-10 py-10 max-w-7xl mx-auto w-full z-10">
        <div className={cn(
          "rounded-3xl p-8 sm:p-10 border relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8",
          isDarkMode 
            ? "bg-slate-900/40 border-slate-800" 
            : "bg-gradient-to-tr from-slate-200/30 to-white border-slate-200"
        )}>
          <div className="space-y-2 max-w-lg text-center md:text-left">
            <h4 className="text-2xl font-display font-black uppercase tracking-tight">
              Verified Geodetic Accuracy.
            </h4>
            <p className={cn(
              "text-xs leading-relaxed font-semibold transition-colors",
              isDarkMode ? "text-slate-400" : "text-slate-600"
            )}>
              CampusGryd integrates real coordinate pairs collected from the Rivers State University spatial project, allowing you to walk with 100% confidence.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 md:gap-12 shrink-0 text-center">
            <div className="space-y-0.5">
              <h5 className="text-3xl md:text-4xl font-display font-black uppercase text-blue-600 dark:text-blue-400">55+</h5>
              <p className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider">GEODETIC NODES</p>
            </div>
            <div className="space-y-0.5">
              <h5 className="text-3xl md:text-4xl font-display font-black uppercase text-emerald-500">100%</h5>
              <p className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider">PEDESTRIAN ROADS</p>
            </div>
          </div>
        </div>
      </section>

      {/* Accordion FAQ Area */}
      <section id="faq-section" className="px-4 sm:px-6 md:px-10 py-14 max-w-4xl mx-auto w-full">
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h4 className="text-2xl sm:text-3xl font-display font-black uppercase tracking-tight">
              FREQUENTLY ASKED QUESTIONS
            </h4>
            <p className={cn(
              "text-xs sm:text-sm font-semibold",
              isDarkMode ? "text-slate-400" : "text-slate-600"
            )}>
              Everything you need to know about navigating Rivers State University with CampusGryd.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isExpanded = expandedFaq === idx;
              return (
                <div
                  key={idx}
                  className={cn(
                    "border rounded-2xl overflow-hidden transition-all",
                    isDarkMode 
                      ? "border-slate-850 bg-slate-950/60" 
                      : "border-slate-200 bg-white shadow-sm"
                  )}
                >
                  <button
                    onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                    className="w-full flex items-center justify-between p-4 font-bold uppercase tracking-tight text-xs sm:text-sm text-left select-none hover:text-blue-500 transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <span className={cn(
                      "w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-xs transition-transform duration-200 shrink-0 ml-3",
                      isExpanded ? "rotate-90 text-blue-500" : "text-slate-400"
                    )}>
                      {isExpanded ? "−" : "+"}
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                      >
                        <div className={cn(
                          "px-4 pb-4 text-xs sm:text-sm leading-relaxed border-t transition-colors font-medium",
                          isDarkMode ? "text-slate-400 border-slate-900" : "text-slate-600 border-slate-100"
                        )}>
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* RSU Student Testimonials */}
      <section className="px-4 sm:px-6 md:px-10 py-10 max-w-7xl mx-auto w-full text-center space-y-8">
        <div className="space-y-1">
          <p className="text-[10px] font-mono text-blue-500 font-bold uppercase tracking-widest">
            RSU STUDENT FEEDBACK
          </p>
          <h4 className="text-xl sm:text-2xl font-display font-black uppercase tracking-tight">
            Loved by Students Across Faculties.
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <div className={cn(
            "p-5 rounded-2xl border text-left space-y-3",
            isDarkMode ? "bg-slate-900/30 border-slate-850" : "bg-white border-slate-200"
          )}>
            <div className="flex items-center gap-1 text-amber-500 text-xs">
              {"★★★★★".split("").map((s, i) => <span key={i}>{s}</span>)}
            </div>
            <p className={cn(
              "text-xs leading-relaxed font-medium italic",
              isDarkMode ? "text-slate-350" : "text-slate-600"
            )}>
              &ldquo;Finding the science block and New Senate on my first clearance day was stress-free with CampusGryd's step guidance. Avoided the typical campus orientation confusion.&rdquo;
            </p>
            <div>
              <p className="text-xs font-black uppercase text-slate-900 dark:text-slate-100">Emmanuel Chinedu</p>
              <p className="text-[10px] text-slate-400">Mechanical Engineering • Year 3</p>
            </div>
          </div>

          <div className={cn(
            "p-5 rounded-2xl border text-left space-y-3",
            isDarkMode ? "bg-slate-900/30 border-slate-850" : "bg-white border-slate-200"
          )}>
            <div className="flex items-center gap-1 text-amber-500 text-xs">
              {"★★★★★".split("").map((s, i) => <span key={i}>{s}</span>)}
            </div>
            <p className={cn(
              "text-xs leading-relaxed font-medium italic",
              isDarkMode ? "text-slate-350" : "text-slate-600"
            )}>
              &ldquo;The lecture schedule integration is a total life-saver. One-click directions straight from my timetable ensures I always make it to continuous assessment tests on time.&rdquo;
            </p>
            <div>
              <p className="text-xs font-black uppercase text-slate-900 dark:text-slate-100">Blessing Alaba</p>
              <p className="text-[10px] text-slate-400">Faculty of Law • Year 2</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={cn(
        "mt-auto border-t py-10 px-4 sm:px-6 md:px-10 transition-colors",
        isDarkMode ? "bg-slate-950 border-slate-900 text-slate-400" : "bg-white border-slate-200 text-slate-600"
      )}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs font-semibold">
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-700 to-sky-500 flex items-center justify-center font-black text-[11px] text-white shadow-sm shrink-0">
              CG
            </div>
            <div>
              <p className="font-bold uppercase tracking-tight text-xs text-slate-900 dark:text-slate-100">
                CAMPUSGRYD NAVIGATION SUITE
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">© 2026 Rivers State University Initiative</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5 text-[11px] text-slate-400">
            <button className="hover:text-blue-500 cursor-pointer flex items-center gap-1" onClick={() => onNavigateToMap()}>
              Campus Map
            </button>
            <span>•</span>
            <button className="hover:text-blue-500 cursor-pointer" onClick={() => onNavigateToMap(null, true)}>
              Class Timetable
            </button>
            <span>•</span>
            <button className="hover:text-blue-500 cursor-pointer" onClick={() => onNavigateToMap(null, false, true)}>
              Events
            </button>
          </div>

          <div className="text-center md:text-right">
            <p className="text-[10px] font-mono text-slate-400">
              Geodetic Registry Verified v5.32 • Rivers State University
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
