import { User } from 'firebase/auth';

export interface CampusEvent {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  category: 'academic' | 'social' | 'sports' | 'conference' | 'other';
  locationId: string;
  startTime: string;
  endTime: string;
  organizer: string;
  creatorId?: string;
  creatorEmail?: string;
  createdAt?: string;
  isCustom?: boolean;
}

export const ADMIN_EMAILS = [
  'progressphilemon@gmail.com',
  'admin@rsu.edu.ng'
];

export const isUserAdmin = (user?: User | { email?: string | null } | null): boolean => {
  if (!user || !user.email) return false;
  const normalizedEmail = user.email.trim().toLowerCase();
  return ADMIN_EMAILS.includes(normalizedEmail);
};

export const campusEvents: CampusEvent[] = [
  {
    id: 'e1',
    title: 'Inter-Faculty Football Finals',
    description: 'The highly anticipated final match between Faculty of Engineering and Faculty of Law.',
    date: '2026-05-15',
    category: 'sports',
    locationId: 'sports_complex',
    startTime: '14:00',
    endTime: '17:00',
    organizer: 'RSU Sports Directorate',
    creatorEmail: 'sports@rsu.edu.ng'
  },
  {
    id: 'e2',
    title: 'Technology & Innovation Symposium',
    description: 'A gathering of tech enthusiasts and experts to discuss the future of AI in Africa.',
    date: '2026-05-18',
    category: 'conference',
    locationId: 'pg_school',
    startTime: '09:00',
    endTime: '16:00',
    organizer: 'Faculty of Engineering',
    creatorEmail: 'engineering@rsu.edu.ng'
  },
  {
    id: 'e3',
    title: 'Matriculation Ceremony',
    description: 'Official welcoming of the fresh students into the RSU community.',
    date: '2026-05-20',
    category: 'academic',
    locationId: 'convocation_arena',
    startTime: '10:00',
    endTime: '13:00',
    organizer: 'RSU Registry',
    creatorEmail: 'registry@rsu.edu.ng'
  },
  {
    id: 'e4',
    title: 'Campus Musical Night',
    description: 'An evening of music, dance, and cultural performances.',
    date: '2026-05-22',
    category: 'social',
    locationId: 'amphitheatre',
    startTime: '18:00',
    endTime: '22:00',
    organizer: 'Student Union Government',
    creatorEmail: 'sug@rsu.edu.ng'
  },
  {
    id: 'e5',
    title: 'Guest Lecture: Sustainable Cities',
    description: 'Prof. Adeyinka discusses urban planning in the context of climate change.',
    date: '2026-05-25',
    category: 'academic',
    locationId: 'old_senate',
    startTime: '11:00',
    endTime: '13:00',
    organizer: 'Environmental Sciences',
    creatorEmail: 'enviro@rsu.edu.ng'
  }
];
