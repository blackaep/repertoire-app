import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Linking, TouchableOpacity } from 'react-native';
import { Text, useTheme, ActivityIndicator, Button, Surface, Portal, Dialog, List, IconButton, TextInput } from 'react-native-paper';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import Slider from '@react-native-community/slider';
import { Song, Setlist, AudioMemo } from '../../src/types';
import { getSongById, updateSongProgress, updateSongInstrument, getSetlists, addSongToSetlist, logPracticeSession, addAudioMemo, getAudioMemos, deleteAudioMemo, updateSongNotes } from '../../src/db/db';
import { useAppPreferences } from '../../src/context/PreferencesContext';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function SongDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const theme = useTheme();
    const { hapticsEnabled } = useAppPreferences();
    const [song, setSong] = useState<Song | null>(null);
    const [loading, setLoading] = useState(true);
    const [setlistDialogVisible, setSetlistDialogVisible] = useState(false);
    const [availableSetlists, setAvailableSetlists] = useState<Setlist[]>([]);
    const [practiceToolsExpanded, setPracticeToolsExpanded] = useState(false);

    // Timer State
    const [isPracticing, setIsPracticing] = useState(false);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

    // Metronome State
    const [bpm, setBpm] = useState(120);
    const [isPlayingMetronome, setIsPlayingMetronome] = useState(false);
    const [currentBeat, setCurrentBeat] = useState(0);
    const [metronomeInterval, setMetronomeInterval] = useState<NodeJS.Timeout | null>(null);
    const [metronomeSound, setMetronomeSound] = useState<Audio.Sound | null>(null);

    useEffect(() => {
        const loadMetronomeSound = async () => {
            try {
                // Ensure audio plays in silent mode iOS
                await Audio.setAudioModeAsync({
                    playsInSilentModeIOS: true,
                    staysActiveInBackground: false,
                    shouldDuckAndroid: true,
                });

                const { sound } = await Audio.Sound.createAsync(
                    require('../../assets/click.wav')
                );
                setMetronomeSound(sound);
            } catch (e) {
                console.error('Failed to load metronome sound', e);
            }
        };
        loadMetronomeSound();
        return () => {
            // Cleanup
            if (metronomeSound) {
                metronomeSound.unloadAsync();
            }
        };
    }, []);

    useEffect(() => {
        return () => {
            if (metronomeInterval) clearInterval(metronomeInterval);
        };
    }, [metronomeInterval]);

    const playClick = async () => {
        if (metronomeSound) {
            try {
                await metronomeSound.replayAsync();
                if (hapticsEnabled) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
            } catch (e) {
                console.log('Error playing click', e);
            }
        }
    };

    const toggleMetronome = async () => {
        if (isPlayingMetronome) {
            if (metronomeInterval) clearInterval(metronomeInterval);
            setIsPlayingMetronome(false);
            setMetronomeInterval(null);
            setCurrentBeat(0);
        } else {
            setIsPlayingMetronome(true);
            const intervalMs = 60000 / bpm;

            // Play immediately for the first beat
            setCurrentBeat(1);
            playClick();

            const interval = setInterval(() => {
                setCurrentBeat(b => {
                    const next = b >= 4 ? 1 : b + 1;
                    playClick(); // Play on beat
                    return next;
                });
            }, intervalMs);
            setMetronomeInterval(interval);
        }
    };

    const loadSetlists = async () => {
        const lists = await getSetlists();
        setAvailableSetlists(lists);
    };

    // Load song data
    useEffect(() => {
        const loadSong = async () => {
            if (typeof id === 'string') {
                const data = await getSongById(id);
                setSong(data);
            }
            setLoading(false);
        };
        loadSong();
        loadMemos();
    }, [id]);

    const loadMemos = async () => {
        if (typeof id === 'string') {
            const data = await getAudioMemos(id);
            setMemos(data);
        }
    };

    // Audio Memo State
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [memos, setMemos] = useState<AudioMemo[]>([]);
    const [permissionResponse, requestPermission] = Audio.usePermissions();
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timeout | null>(null);

    const startRecording = async () => {
        try {
            if (permissionResponse?.status !== 'granted') {
                console.log('Requesting permission..');
                await requestPermission();
            }
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            console.log('Starting recording..');
            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(recording);
            console.log('Recording started');

            // Timer
            setRecordingDuration(0);
            const interval = setInterval(() => {
                setRecordingDuration(d => d + 1);
            }, 1000);
            setRecordingInterval(interval);
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    };

    const stopRecording = async () => {
        console.log('Stopping recording..');
        if (!recording) return;

        if (recordingInterval) clearInterval(recordingInterval);
        setRecordingInterval(null);
        setRecording(null);

        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        console.log('Recording stopped and stored at', uri);

        if (uri && song) {
            await addAudioMemo(song.id, uri, recordingDuration);
            loadMemos();
        }
    };

    const playMemo = async (uri: string) => {
        try {
            console.log('Playing memo:', uri);
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
            });
            const { sound } = await Audio.Sound.createAsync(
                { uri },
                { shouldPlay: true }
            );
            await sound.playAsync();
        } catch (error) {
            console.error('Failed to play memo:', error);
        }
    };

    const handleDeleteMemo = async (memoId: string) => {
        await deleteAudioMemo(memoId);
        loadMemos();
    };

    // Timer Logic
    const togglePractice = () => {
        if (isPracticing) {
            // Stop
            if (timerInterval) clearInterval(timerInterval);
            setIsPracticing(false);
            setTimerInterval(null);
        } else {
            // Start
            setIsPracticing(true);
            const interval = setInterval(() => {
                setTimerSeconds(s => s + 1);
            }, 1000);
            setTimerInterval(interval);
        }
    };

    const finishPractice = async () => {
        if (timerInterval) clearInterval(timerInterval);
        setIsPracticing(false);
        setTimerInterval(null);

        if (timerSeconds > 0 && song) {
            await logPracticeSession(song.id, timerSeconds);
            setTimerSeconds(0);
            // Could show a snackbar here
        }
    };





    const formatTime = (totalSeconds: number) => {
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // Handle progress update
    const handleProgressChange = async (value: number) => {
        if (!song) return;

        const newProgress = Math.round(value);
        let newStatus = song.status;

        if (newProgress === 100) {
            newStatus = 'LEARNED';
        } else if (newProgress < 100 && song.status === 'LEARNED') {
            // If it was learned but moved back, revert to LEARNING (or WANT_TO_LEARN if 0, but LEARNING is safer)
            newStatus = 'LEARNING';
        } else if (newProgress > 0 && song.status === 'WANT_TO_LEARN') {
            newStatus = 'LEARNING';
        }

        // Optimistic update
        setSong({ ...song, progress: newProgress, status: newStatus });

        // Persist
        try {
            await updateSongProgress(song.id, newProgress, newStatus);
        } catch (error) {
            console.error("Failed to update progress", error);
        }
    };

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!song) {
        return (
            <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
                <Text style={{ color: theme.colors.error }}>Song not found</Text>
            </View>
        );
    }

    // Reverting to robust search results to avoid "Playback ID" errors and defaults
    const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(song.artist + ' ' + song.title)}`;

    // Using specific pattern search for Songsterr (Artist + Title) to avoid "Stairway to Heaven" default
    const songsterrUrl = `https://www.songsterr.com/a/wa/search?pattern=${encodeURIComponent(song.artist + ' ' + song.title)}`;

    return (
        <>
            <Stack.Screen options={{
                headerShown: true,
                title: song.title,
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: theme.colors.primary,
                headerTitleStyle: { fontWeight: 'bold' },
            }} />
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom', 'left', 'right']}>
                <ScrollView contentContainerStyle={styles.scrollContent}>

                    <View style={styles.header}>
                        <Text variant="headlineMedium" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>{song.title}</Text>
                        <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>{song.artist}</Text>
                    </View>

                    {/* Progress Section */}
                    <Surface style={[styles.section, { backgroundColor: theme.colors.elevation.level1 }]} elevation={1}>
                        <View style={styles.progressHeader}>
                            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>Progress</Text>
                            <Text variant="titleMedium" style={{ color: theme.colors.primary }}>{song.progress}%</Text>
                        </View>
                        <Slider
                            style={{ width: '100%', height: 40 }}
                            minimumValue={0}
                            maximumValue={100}
                            step={1}
                            value={song.progress}
                            minimumTrackTintColor={theme.colors.primary}
                            maximumTrackTintColor={theme.colors.surfaceVariant}
                            thumbTintColor={theme.colors.primary}
                            onSlidingComplete={handleProgressChange}
                        />
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                            {song.status === 'LEARNED' ? 'Great job! Song learned.' : 'Slide to track your learning progress.'}
                        </Text>
                    </Surface>

                    {/* Instrument Selector */}
                    <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Instrument</Text>
                    <View style={styles.instrumentContainer}>
                        {['Acoustic', 'Electric', 'Bass', 'Classical', 'Piano'].map((inst) => {
                            const isSelected = song.instrument === inst;
                            return (
                                <TouchableOpacity
                                    key={inst}
                                    onPress={async () => {
                                        const newInst = isSelected ? '' : inst; // toggle
                                        setSong({ ...song, instrument: newInst as any });
                                        try {
                                            await updateSongInstrument(song.id, newInst);
                                        } catch (e) {
                                            console.error(e);
                                        }
                                    }}
                                    style={[
                                        styles.instrumentChip,
                                        { backgroundColor: isSelected ? theme.colors.primary : theme.colors.surfaceVariant }
                                    ]}
                                >
                                    <Text style={{
                                        color: isSelected ? theme.colors.onPrimary : theme.colors.onSurfaceVariant,
                                        fontWeight: '600',
                                        fontSize: 12
                                    }}>
                                        {inst}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Embeds */}
                    <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Listen & Learn</Text>

                    <TouchableOpacity
                        style={styles.webviewContainer}
                        onPress={() => Linking.openURL(youtubeUrl)}
                        activeOpacity={0.9}
                    >
                        <WebView
                            source={{ uri: youtubeUrl }}
                            style={styles.webview}
                            nestedScrollEnabled={false}
                            scrollEnabled={false}
                            pointerEvents="none" // Disable interaction within WebView
                        />
                        {/* Overlay Container for perfect centering */}
                        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', zIndex: 1 }]}>
                            <View style={styles.openButtonOverlay}>
                                <Text style={{ color: 'white', fontWeight: 'bold' }}>Open in YouTube</Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Tabs</Text>

                    <TouchableOpacity
                        style={styles.webviewContainer}
                        onPress={() => Linking.openURL(songsterrUrl)}
                        activeOpacity={0.9}
                    >
                        <WebView
                            source={{ uri: songsterrUrl }}
                            style={styles.webview}
                            nestedScrollEnabled={false}
                            scrollEnabled={false}
                            pointerEvents="none"
                        />
                        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', zIndex: 1 }]}>
                            <View style={styles.openButtonOverlay}>
                                <Text style={{ color: 'white', fontWeight: 'bold' }}>Open in Songsterr</Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    {/* Practice Tools Dropdown (Custom implementation to avoid List.Accordion indentation) */}
                    <TouchableOpacity
                        onPress={() => setPracticeToolsExpanded(!practiceToolsExpanded)}
                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.elevation.level1, padding: 16, borderRadius: 16, marginBottom: practiceToolsExpanded ? 16 : 24 }}
                    >
                        <List.Icon icon="music-circle" color={theme.colors.primary} style={{ margin: 0, padding: 0, height: 24, width: 24, marginHorizontal: 0 }} />
                        <Text style={{ flex: 1, marginLeft: 16, color: theme.colors.primary, fontWeight: 'bold', fontSize: 20 }}>Practice Tools</Text>
                        <IconButton
                            icon={practiceToolsExpanded ? "chevron-up" : "chevron-down"}
                            iconColor={theme.colors.primary}
                            size={24}
                            style={{ margin: 0 }}
                        />
                    </TouchableOpacity>

                    {practiceToolsExpanded && (
                        <View style={{ gap: 16, marginBottom: 24 }}>
                            {/* Metronome */}
                            <Surface style={[styles.section, { backgroundColor: theme.colors.elevation.level1, borderColor: isPlayingMetronome ? theme.colors.tertiary : 'transparent', borderWidth: 1, marginBottom: 0 }]} elevation={1}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, width: '100%' }}>
                                    <Text variant="titleMedium" style={{ color: theme.colors.onSurface, textAlign: 'center' }}>Metronome</Text>
                                    <View style={{ flexDirection: 'row', gap: 4, position: 'absolute', right: 0 }}>
                                        {[1, 2, 3, 4].map(beat => (
                                            <View key={beat} style={{
                                                width: 12, height: 12, borderRadius: 6,
                                                backgroundColor: currentBeat === beat ? theme.colors.tertiary : theme.colors.surfaceVariant
                                            }} />
                                        ))}
                                    </View>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <View style={{ flex: 1, marginRight: 16, alignItems: 'center' }}>
                                        <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>{bpm} BPM</Text>
                                        <Slider
                                            style={{ width: '100%', height: 40 }}
                                            minimumValue={40}
                                            maximumValue={200}
                                            step={1}
                                            value={bpm}
                                            minimumTrackTintColor={theme.colors.tertiary}
                                            maximumTrackTintColor={theme.colors.surfaceVariant}
                                            thumbTintColor={theme.colors.tertiary}
                                            onSlidingComplete={setBpm}
                                            disabled={isPlayingMetronome}
                                        />
                                    </View>
                                    <View>
                                        <IconButton
                                            icon={isPlayingMetronome ? "stop-circle" : "play-circle"}
                                            size={56}
                                            iconColor={theme.colors.tertiary}
                                            onPress={toggleMetronome}
                                            style={{ margin: 0 }}
                                        />
                                    </View>
                                </View>
                            </Surface>

                            {/* Practice Timer */}
                            <Surface style={[styles.section, { backgroundColor: theme.colors.elevation.level1, borderColor: isPracticing ? theme.colors.primary : 'transparent', borderWidth: 1, marginBottom: 0 }]} elevation={1}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <View>
                                        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 4 }}>Practice Session</Text>
                                        <Text variant="displayMedium" style={{ color: theme.colors.primary, fontFamily: 'monospace' }}>
                                            {formatTime(timerSeconds)}
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <IconButton
                                            icon={isPracticing ? "pause-circle" : "play-circle"}
                                            size={56}
                                            iconColor={theme.colors.primary}
                                            onPress={togglePractice}
                                            style={{ margin: 0 }}
                                        />
                                        {timerSeconds > 0 && !isPracticing && (
                                            <IconButton
                                                icon="check-circle"
                                                size={56}
                                                iconColor={theme.colors.secondary}
                                                onPress={finishPractice}
                                                style={{ margin: 0 }}
                                            />
                                        )}
                                    </View>
                                </View>
                            </Surface>

                            {/* Audio Memos */}
                            <Surface style={[styles.section, { backgroundColor: theme.colors.elevation.level1, borderColor: recording ? theme.colors.error : 'transparent', borderWidth: 1, marginBottom: 0 }]} elevation={1}>
                                <View style={{ alignItems: 'center', marginBottom: 10 }}>
                                    <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>Audio Memos</Text>
                                    {recording && (
                                        <Text variant="bodyMedium" style={{ color: theme.colors.error, fontWeight: 'bold', marginTop: 4 }}>
                                            Recording: {formatTime(recordingDuration)}
                                        </Text>
                                    )}
                                </View>

                                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                                    <Button
                                        mode={recording ? "contained" : "outlined"}
                                        icon={recording ? "stop" : "microphone"}
                                        onPress={recording ? stopRecording : startRecording}
                                        buttonColor={recording ? theme.colors.error : undefined}
                                        textColor={recording ? theme.colors.onError : theme.colors.primary}
                                        style={{ borderRadius: 24 }}
                                    >
                                        {recording ? "Stop Recording" : "New Recording"}
                                    </Button>
                                </View>

                                {memos.length > 0 ? (
                                    memos.map(memo => (
                                        <View key={memo.id} style={{
                                            flexDirection: 'row', alignItems: 'center',
                                            backgroundColor: theme.colors.surfaceVariant,
                                            padding: 12, borderRadius: 12, marginBottom: 8
                                        }}>
                                            <IconButton icon="play-circle" onPress={() => playMemo(memo.uri)} iconColor={theme.colors.primary} />
                                            <View style={{ flex: 1 }}>
                                                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>{new Date(memo.createdAt).toLocaleDateString()} {new Date(memo.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{formatTime(memo.duration)}</Text>
                                            </View>
                                            <IconButton icon="delete" iconColor={theme.colors.error} onPress={() => handleDeleteMemo(memo.id)} />
                                        </View>
                                    ))
                                ) : (
                                    <Text style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                                        No memos recorded yet.
                                    </Text>
                                )}
                            </Surface>
                        </View>
                    )}

                    {/* Notes Section */}
                    <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface, marginTop: 24 }]}>Notes</Text>
                    <Surface style={[styles.section, { backgroundColor: theme.colors.elevation.level1 }]} elevation={1}>
                        <TextInput
                            mode="outlined"
                            placeholder="Add your notes specific to this song..."
                            value={song.notes || ''}
                            onChangeText={(text) => {
                                setSong({ ...song, notes: text });
                            }}
                            onEndEditing={async () => {
                                if (song.notes !== undefined) {
                                    await updateSongNotes(song.id, song.notes);
                                }
                            }}
                            multiline
                            numberOfLines={4}
                            style={{ backgroundColor: theme.colors.elevation.level1 }}
                            theme={{ colors: { primary: theme.colors.primary, background: theme.colors.elevation.level1 } }}
                            textColor={theme.colors.onSurface}
                        />
                    </Surface>

                </ScrollView>

                {/* Add to Setlist Button */}
                <View style={styles.floatingAction}>
                    <Button
                        mode="contained"
                        icon="playlist-plus"
                        onPress={() => {
                            loadSetlists();
                            setSetlistDialogVisible(true);
                        }}
                        buttonColor={theme.colors.primary}
                        textColor={theme.colors.onPrimary}
                    >
                        Add to Setlist
                    </Button>
                </View>

                {/* Setlist Dialog */}
                <Portal>
                    <Dialog visible={setlistDialogVisible} onDismiss={() => setSetlistDialogVisible(false)} style={{ backgroundColor: theme.colors.surface, borderRadius: 14, width: '80%', alignSelf: 'center' }}>
                        <Dialog.Title style={{ color: theme.colors.onSurface, textAlign: 'center', fontWeight: 'bold' }}>Add to Setlist</Dialog.Title>
                        <Dialog.Content style={{ maxHeight: 300, paddingHorizontal: 0 }}>
                            <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ paddingHorizontal: 24 }}>
                                {availableSetlists.length === 0 ? (
                                    <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>No setlists found. Create one in the Setlists tab.</Text>
                                ) : (
                                    availableSetlists.map(list => (
                                        <TouchableOpacity
                                            key={list.id}
                                            onPress={async () => {
                                                if (song) {
                                                    await addSongToSetlist(list.id, song.id);
                                                    setSetlistDialogVisible(false);
                                                }
                                            }}
                                            style={{ paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#333', flexDirection: 'row', alignItems: 'center' }}
                                        >
                                            <List.Icon icon="playlist-music" color={theme.colors.primary} />
                                            <Text style={{ color: theme.colors.onSurface, fontSize: 17, marginLeft: 10 }}>{list.name}</Text>
                                        </TouchableOpacity>
                                    ))
                                )}
                            </ScrollView>
                        </Dialog.Content>
                        <Dialog.Actions style={{ flexDirection: 'column', padding: 0 }}>
                            <TouchableOpacity onPress={() => setSetlistDialogVisible(false)} style={{ width: '100%', paddingVertical: 12, borderTopWidth: 0.5, borderColor: '#333', alignItems: 'center' }}>
                                <Text style={{ color: theme.colors.primary, fontSize: 17, fontWeight: 'bold' }}>Cancel</Text>
                            </TouchableOpacity>
                        </Dialog.Actions>
                    </Dialog>
                </Portal>

            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 20,
    },
    section: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    sectionTitle: {
        marginBottom: 12,
        fontWeight: 'bold',
    },
    webviewContainer: {
        height: 250,
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 24,
        backgroundColor: '#000',
    },
    webview: {
        flex: 1,
        opacity: 0.6, // Dim background slightly
    },
    openButtonOverlay: {
        // Position handled by parent
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    instrumentContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 24,
    },
    instrumentChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        marginRight: 10,
        marginBottom: 10,
    },
    floatingAction: {
        position: 'absolute',
        bottom: 30,
        right: 20,
    }
});
