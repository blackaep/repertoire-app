export interface Song {
  id: string;          // Unique iTunes Track ID (or generated)
  title: string;       // Song Name
  artist: string;      // Artist Name
  albumArt: string;    // High-res URL
  status: 'WANT_TO_LEARN' | 'LEARNING' | 'LEARNED';
  progress: number;    // 0 to 100
  notes?: string;      // User notes
  instrument?: 'Acoustic' | 'Electric' | 'Bass' | 'Classical' | 'Piano';
  addedAt: number;     // Timestamp
}

export interface Setlist {
  id: string;
  name: string;
  createdAt: number;
}

export interface SetlistItem {
  id: string;
  setlistId: string;
  songId: string;
  order: number;
}

export interface PracticeSession {
  id: string;
  songId: string;
  durationSeconds: number;
  date: number; // Timestamp
}

export interface ITunesResult {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
}

export interface AudioMemo {
  id: string;
  songId: string;
  uri: string;
  createdAt: string; // ISO string
  duration: number; // seconds
}
