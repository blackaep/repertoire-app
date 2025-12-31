import * as SQLite from 'expo-sqlite';
import { Song } from '../types';

export let db: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async () => {
    try {
        db = await SQLite.openDatabaseAsync('repertoire.db');
        await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS songs (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        albumArt TEXT NOT NULL,
        status TEXT NOT NULL,
        progress INTEGER NOT NULL,
        notes TEXT,
        instrument TEXT,
        addedAt INTEGER NOT NULL
      );
    `);

        // Migration: Add instrument column if it doesn't exist
        try {
            await db.execAsync('ALTER TABLE songs ADD COLUMN instrument TEXT;');
            console.log('Added instrument column');
        } catch (e) {
            // Ignore error if column already exists
        }

        // Migration: Add notes column if it doesn't exist
        try {
            await db.execAsync('ALTER TABLE songs ADD COLUMN notes TEXT;');
            console.log('Added notes column');
        } catch (e) {
            // Ignore error if column already exists
        }

        // Setlists Tables
        await db.execAsync(`
      CREATE TABLE IF NOT EXISTS setlists (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        createdAt INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS setlist_items (
        id TEXT PRIMARY KEY NOT NULL,
        setlistId TEXT NOT NULL,
        songId TEXT NOT NULL,
        songOrder INTEGER NOT NULL,
        FOREIGN KEY(setlistId) REFERENCES setlists(id) ON DELETE CASCADE,
        FOREIGN KEY(songId) REFERENCES songs(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS practice_sessions (
        id TEXT PRIMARY KEY NOT NULL,
        songId TEXT NOT NULL,
        durationSeconds INTEGER NOT NULL,
        date INTEGER NOT NULL,
        FOREIGN KEY(songId) REFERENCES songs(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS audio_memos (
        id TEXT PRIMARY KEY NOT NULL,
        songId TEXT NOT NULL,
        uri TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        duration INTEGER NOT NULL,
        FOREIGN KEY(songId) REFERENCES songs(id) ON DELETE CASCADE
      );
    `);

        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
};

export const logPracticeSession = async (songId: string, durationSeconds: number) => {
    if (!db) return;
    const id = Date.now().toString();
    try {
        await db.runAsync(
            'INSERT INTO practice_sessions (id, songId, durationSeconds, date) VALUES (?, ?, ?, ?)',
            [id, songId, durationSeconds, Date.now()]
        );
        console.log(`Logged practice: ${durationSeconds}s for song ${songId}`);
    } catch (error) {
        console.error('Error logging practice session:', error);
        throw error;
    }
};

export const getSongPracticeSessions = async (songId: string) => {
    if (!db) return [];
    try {
        const result = await db.getAllAsync('SELECT * FROM practice_sessions WHERE songId = ? ORDER BY date DESC', [songId]);
        return result as any[];
    } catch (error) {
        console.error('Error getting practice sessions:', error);
        return [];
    }
};

export const createSetlist = async (name: string) => {
    if (!db) return;
    const id = Date.now().toString(); // Simple ID generation
    try {
        await db.runAsync(
            'INSERT INTO setlists (id, name, createdAt) VALUES (?, ?, ?)',
            [id, name, Date.now()]
        );
        console.log(`Created setlist: ${name}`);
        return { id, name, createdAt: Date.now() };
    } catch (error) {
        console.error('Error creating setlist:', error);
        throw error;
    }
};

export const getSetlists = async () => {
    if (!db) return [];
    try {
        const result = await db.getAllAsync('SELECT * FROM setlists ORDER BY createdAt DESC');
        return result as any[];
    } catch (error) {
        console.error('Error getting setlists:', error);
        return [];
    }
};

export const deleteSetlist = async (id: string) => {
    if (!db) return;
    try {
        await db.runAsync('DELETE FROM setlists WHERE id = ?', [id]);
        console.log(`Deleted setlist ${id}`);
    } catch (error) {
        console.error('Error deleting setlist:', error);
        throw error;
    }
};

export const addSongToLibrary = async (song: Song) => {
    if (!db) {
        console.error('Database not initialized');
        return;
    }
    try {
        // Check if song exists to avoid duplicates (optional, but good UX)
        const existing = await db.getAllAsync('SELECT * FROM songs WHERE id = ?', [song.id]);
        if (existing.length > 0) {
            console.log('Song already in library');
            return false; // Indicate duplicate
        }

        await db.runAsync(
            `INSERT INTO songs (id, title, artist, albumArt, status, progress, notes, instrument, addedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [song.id, song.title, song.artist, song.albumArt, song.status, song.progress, song.notes || null, song.instrument || null, song.addedAt]
        );
        console.log('Song added to library');
        return true;
    } catch (error) {
        console.error('Error adding song:', error);
        throw error;
    }
};

// Helper for debugging/verification
export const getSongs = async (): Promise<Song[]> => {
    if (!db) return [];
    try {
        const allRows = await db.getAllAsync('SELECT * FROM songs');
        return allRows as Song[];
    } catch (error) {
        console.error('Error fetching songs:', error);
        return [];
    }
};

export const getSongById = async (id: string): Promise<Song | null> => {
    if (!db) return null;
    try {
        const song = await db.getFirstAsync('SELECT * FROM songs WHERE id = ?', [id]);
        return song as Song || null;
    } catch (error) {
        console.error('Error fetching song by id:', error);
        return null;
    }
};

export const updateSongProgress = async (id: string, progress: number, status: string) => {
    if (!db) return;
    try {
        await db.runAsync(
            'UPDATE songs SET progress = ?, status = ? WHERE id = ?',
            [progress, status, id]
        );
        console.log(`Updated song ${id}: progress=${progress}, status=${status}`);
    } catch (error) {
        console.error('Error updating song progress:', error);
        throw error;
    }
};



export const updateSongInstrument = async (id: string, instrument: string) => {
    if (!db) return;
    try {
        await db.runAsync(
            'UPDATE songs SET instrument = ? WHERE id = ?',
            [instrument, id]
        );
        console.log(`Updated song ${id}: instrument=${instrument}`);
    } catch (error) {
        console.error('Error updating song instrument:', error);
        throw error;
    }
};

export const updateSongNotes = async (id: string, notes: string) => {
    if (!db) return;
    try {
        await db.runAsync(
            'UPDATE songs SET notes = ? WHERE id = ?',
            [notes, id]
        );
        console.log(`Updated song ${id}: notes=${notes.substring(0, 20)}...`);
    } catch (error) {
        console.error('Error updating song notes:', error);
        throw error;
    }
};

export const deleteSong = async (id: string) => {
    if (!db) return;
    try {
        await db.runAsync('DELETE FROM songs WHERE id = ?', [id]);
        console.log(`Deleted song ${id}`);
    } catch (error) {
        console.error('Error deleting song:', error);
        throw error;
    }
};

export const addSongToSetlist = async (setlistId: string, songId: string) => {
    if (!db) return;
    try {
        // Get current count to set order
        const existing = await db.getAllAsync('SELECT * FROM setlist_items WHERE setlistId = ?', [setlistId]);
        const order = existing.length;
        const id = `${setlistId}_${songId}_${Date.now()}`;

        await db.runAsync(
            'INSERT INTO setlist_items (id, setlistId, songId, songOrder) VALUES (?, ?, ?, ?)',
            [id, setlistId, songId, order]
        );
        console.log(`Added song ${songId} to setlist ${setlistId}`);
    } catch (error) {
        console.error('Error adding song to setlist:', error);
        throw error;
    }
};

export const getSetlistSongs = async (setlistId: string): Promise<Song[]> => {
    if (!db) return [];
    try {
        // Join with songs table to get full details
        const result = await db.getAllAsync(
            `SELECT s.* FROM songs s 
       JOIN setlist_items si ON s.id = si.songId 
       WHERE si.setlistId = ? 
       ORDER BY si.songOrder ASC`,
            [setlistId]
        );
        return result as Song[];
    } catch (error) {
        console.error('Error getting setlist songs:', error);
        return [];
    }
};

export const removeSongFromSetlist = async (setlistId: string, songId: string) => {
    if (!db) return;
    try {
        await db.runAsync('DELETE FROM setlist_items WHERE setlistId = ? AND songId = ?', [setlistId, songId]);
    } catch (error) {
        console.error('Error removing song from setlist:', error);
        throw error;
    }
};

export const addAudioMemo = async (songId: string, uri: string, duration: number) => {
    if (!db) return;
    const id = Date.now().toString();
    try {
        await db.runAsync(
            'INSERT INTO audio_memos (id, songId, uri, createdAt, duration) VALUES (?, ?, ?, ?, ?)',
            [id, songId, uri, new Date().toISOString(), duration]
        );
        console.log(`Added audio memo for song ${songId}`);
    } catch (error) {
        console.error('Error adding audio memo:', error);
        throw error;
    }
};

export const getAudioMemos = async (songId: string) => {
    if (!db) return [];
    try {
        const result = await db.getAllAsync('SELECT * FROM audio_memos WHERE songId = ? ORDER BY createdAt DESC', [songId]);
        return result as any[];
    } catch (error) {
        console.error('Error getting audio memos:', error);
        return [];
    }
};

export const deleteAudioMemo = async (id: string) => {
    if (!db) return;
    try {
        await db.runAsync('DELETE FROM audio_memos WHERE id = ?', [id]);
    } catch (error) {
        console.error('Error deleting audio memo:', error);
        throw error;
    }
};

export const getPracticeStats = async () => {
    if (!db) return { totalDuration: 0, lastSevenDays: [], currentStreak: 0 };
    try {
        const now = new Date();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        const timestamp7Days = sevenDaysAgo.getTime();

        // 1. Last 7 Days Data
        const sessions = await db.getAllAsync(
            'SELECT * FROM practice_sessions WHERE date >= ? ORDER BY date ASC',
            [timestamp7Days]
        ) as any[];

        const lastSevenDays = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            const dateStr = d.toLocaleDateString(undefined, { weekday: 'short' });

            // Sum duration for this day
            // Note: simplistic day matching (ignoring time)
            const dayStart = new Date(d.setHours(0, 0, 0, 0)).getTime();
            const dayEnd = new Date(d.setHours(23, 59, 59, 999)).getTime();

            const daySessions = sessions.filter(s => s.date >= dayStart && s.date <= dayEnd);
            const duration = daySessions.reduce((acc, curr) => acc + curr.durationSeconds, 0);

            lastSevenDays.push({ label: dateStr, value: duration / 60 }); // Minutes
        }

        // 2. Streak Calculation (naive: check backwards day by day)
        // Ideally we'd query distinct dates.
        const distinctDates = await db.getAllAsync('SELECT DISTINCT date FROM practice_sessions ORDER BY date DESC') as any[];
        let streak = 0;
        let checkDate = new Date();
        // Reset checkDate to midnight
        checkDate.setHours(0, 0, 0, 0);

        // Normalize distinct dates to days
        const practicedDays = new Set(distinctDates.map(d => new Date(d.date).setHours(0, 0, 0, 0)));

        // Check today
        if (practicedDays.has(checkDate.getTime())) {
            streak++;
        }

        // Check yesterday and backwards
        while (true) {
            checkDate.setDate(checkDate.getDate() - 1);
            if (practicedDays.has(checkDate.getTime())) {
                streak++;
            } else {
                break;
            }
        }

        return {
            totalDuration: 0, // Placeholder
            lastSevenDays,
            currentStreak: streak
        };

    } catch (error) {
        console.error('Error getting stats:', error);
        return { totalDuration: 0, lastSevenDays: [], currentStreak: 0 };
    }
};

export const getSongSuggestion = async (): Promise<Song | null> => {
    if (!db) return null;
    try {
        // Strategy: 1. Pick a "LEARNING" song randomly.
        const learning = await db.getAllAsync("SELECT * FROM songs WHERE status = 'LEARNING'");
        if (learning.length > 0) {
            const random = Math.floor(Math.random() * learning.length);
            return learning[random] as Song;
        }

        // Strategy 2. Pick a "WANT_TO_LEARN" song.
        const wantTo = await db.getAllAsync("SELECT * FROM songs WHERE status = 'WANT_TO_LEARN'");
        if (wantTo.length > 0) {
            const random = Math.floor(Math.random() * wantTo.length);
            return wantTo[random] as Song;
        }

        // Strategy 3. Just pick anything.
        const anySong = await db.getFirstAsync("SELECT * FROM songs ORDER BY RANDOM() LIMIT 1");
        return anySong as Song || null;

    } catch (error) {
        console.error('Error getting suggestion:', error);
        return null;
    }
};
