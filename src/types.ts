export type LocationType = 'faculty' | 'college' | 'admin' | 'hostel' | 'food' | 'gate' | 'sports' | 'library' | 'facility' | 'landmark';

export interface Location {
  id: string;
  officialName: string;
  aliases: string[];
  coordinates: [number, number]; // [lat, lng]
  type: LocationType;
  description: string;
  landmark: string;
  address?: string;
  image?: string;
  entryNodeIdx?: number;
}

export interface CampusEntry {
  name: string;
  aliases: string[];
  lat: number;
  lng: number;
  address: string;
  type: LocationType;
  description: string;
  landmark: string;
  entryNodeIdx?: number;
}

export interface Maneuver {
  instruction: string;
  distance: number;
  type: 'straight' | 'left' | 'right' | 'slight-left' | 'slight-right' | 'destination';
  coordinates: [number, number];
}

export interface RouteOption {
  id: string;
  name: string;
  duration: number; // in minutes
  distance: number; // in meters
  path: [number, number][];
  maneuvers: Maneuver[];
}

export interface LiveShareSession {
  id: string; // e.g. "RSU-7X9B"
  userId: string;
  userName: string;
  userPhoto?: string;
  userEmail?: string;
  coordinates: [number, number]; // [lat, lng]
  statusNote?: string; // e.g., "Outside Law Faculty canteen"
  expiresAt: number; // unix timestamp ms
  isActive: boolean;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface FriendBeacon {
  session: LiveShareSession;
  distanceMeters?: number;
  lastSeenText?: string;
}

