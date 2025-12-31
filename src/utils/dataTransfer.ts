import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Alert, Platform } from 'react-native';
import { db } from '../db/db';

export const exportData = async () => {
    if (!db) return;
    try {
        // 1. Fetch all data
        const songs = await db.getAllAsync('SELECT * FROM songs');
        const setlists = await db.getAllAsync('SELECT * FROM setlists');
        const setlistItems = await db.getAllAsync('SELECT * FROM setlist_items');
        const practiceSessions = await db.getAllAsync('SELECT * FROM practice_sessions');
        const audioMemos = await db.getAllAsync('SELECT * FROM audio_memos');

        const backupData = {
            version: 1,
            timestamp: new Date().toISOString(),
            songs,
            setlists,
            setlistItems,
            practiceSessions,
            audioMemos
        };

        // 2. Write to temp file
        const fileUri = (FileSystem.cacheDirectory || FileSystem.documentDirectory) + 'repertoire_backup.json';
        await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(backupData, null, 2));

        // 3. Share
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
                mimeType: 'application/json',
                dialogTitle: 'Save Backup File',
                UTI: 'public.json' // Helps iOS recognize file type
            });
        } else {
            Alert.alert('Error', 'Sharing is not available on this device');
        }
    } catch (e) {
        console.error('Export failed', e);
        Alert.alert('Export Failed', 'An error occurred while exporting data.');
    }
};

export const importData = async () => {
    if (!db) return;
    try {
        // 1. Pick file
        const result = await DocumentPicker.getDocumentAsync({
            type: ['application/json', '*/*'], // broadly allow in case of mime issues
            copyToCacheDirectory: true
        });

        if (result.canceled) return;

        const fileUri = result.assets[0].uri;
        const fileContent = await FileSystem.readAsStringAsync(fileUri);
        const data = JSON.parse(fileContent);

        if (!data.version || !data.songs) {
            Alert.alert('Invalid File', 'This does not look like a Repertoire backup file.');
            return;
        }

        // 2. Alert confirmation
        Alert.alert(
            'Confirm Import',
            'This will merge imported data into your current library. Existing items with same IDs will be updated.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Import',
                    onPress: async () => await processImport(data)
                }
            ]
        );

    } catch (e) {
        console.error('Import failed', e);
        Alert.alert('Import Failed', 'An error occurred while importing data.');
    }
};

const processImport = async (data: any) => {
    if (!db) return;
    try {
        // Transaction manually
        // Songs
        for (const song of data.songs) {
            await db.runAsync(
                `INSERT OR REPLACE INTO songs (id, title, artist, progress, instrument, mood, youtubeUrl, songsterrUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [song.id, song.title, song.artist, song.progress, song.instrument, song.mood, song.youtubeUrl, song.songsterrUrl]
            );
        }

        // Setlists
        if (data.setlists) {
            for (const item of data.setlists) {
                await db.runAsync(
                    `INSERT OR REPLACE INTO setlists (id, name, createdAt) VALUES (?, ?, ?)`,
                    [item.id, item.name, item.createdAt]
                );
            }
        }

        // Setlist Items
        if (data.setlistItems) {
            // Clear items for imported setlists to avoid dupes/ordering issues? Or just Replace.
            // Replace is safer for ID conflicts.
            for (const item of data.setlistItems) {
                await db.runAsync(
                    `INSERT OR REPLACE INTO setlist_items (id, setlistId, songId, songOrder) VALUES (?, ?, ?, ?)`,
                    [item.id, item.setlistId, item.songId, item.songOrder]
                );
            }
        }

        Alert.alert('Success', 'Library imported successfully!');
    } catch (e) {
        console.error('Process import failed', e);
        Alert.alert('Import Error', 'Failed to save data to database.');
    }
};
