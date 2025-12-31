import React, { useState } from 'react';
import { View, FlatList, StyleSheet, Image, Keyboard, TouchableOpacity } from 'react-native';
import { Searchbar, Button, ActivityIndicator, Text, useTheme, Snackbar, IconButton, Surface, Portal, Dialog } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Song, ITunesResult } from '../types';
import { addSongToLibrary } from '../db/db';

const SearchScreen = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [results, setResults] = useState<ITunesResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [snackbarVisible, setSnackbarVisible] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [dialogVisible, setDialogVisible] = useState(false);
    const [selectedTrack, setSelectedTrack] = useState<ITunesResult | null>(null);
    const theme = useTheme();

    // Debounce logic
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 500); // 500ms delay

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Search effect
    React.useEffect(() => {
        const performSearch = async () => {
            if (!debouncedQuery.trim()) {
                setResults([]); // Clear results if empty
                return;
            }

            setLoading(true);
            try {
                const response = await fetch(
                    `https://itunes.apple.com/search?term=${encodeURIComponent(debouncedQuery)}&media=music&entity=song`
                );
                const data = await response.json();
                setResults(data.results || []);
            } catch (error) {
                console.error(error);
                // Don't show snackbar for every typing error which might be transient network issues
            } finally {
                setLoading(false);
            }
        };

        performSearch();
    }, [debouncedQuery]);

    const onAddPress = (track: ITunesResult) => {
        setSelectedTrack(track);
        setDialogVisible(true);
    };

    const confirmAddSong = async (status: 'WANT_TO_LEARN' | 'LEARNED') => {
        setDialogVisible(false);
        if (!selectedTrack) return;

        const highResArt = selectedTrack.artworkUrl100.replace('100x100', '600x600');
        const progress = status === 'LEARNED' ? 100 : 0;

        const newSong: Song = {
            id: selectedTrack.trackId.toString(),
            title: selectedTrack.trackName,
            artist: selectedTrack.artistName,
            albumArt: highResArt,
            status: status,
            progress: progress,
            addedAt: Date.now(),
        };

        try {
            const success = await addSongToLibrary(newSong);
            if (success) {
                setSnackbarMessage(`Added "${selectedTrack.trackName}" to ${status === 'LEARNED' ? 'Learned' : 'Want to Learn'} list!`);
            } else {
                setSnackbarMessage(`"${selectedTrack.trackName}" is already in your library.`);
            }
            setSnackbarVisible(true);
        } catch (error) {
            setSnackbarMessage('Failed to add song.');
            setSnackbarVisible(true);
        }
    };

    const renderItem = ({ item }: { item: ITunesResult }) => (
        <Surface style={[styles.resultItem, { backgroundColor: theme.colors.elevation.level1 }]} elevation={0}>
            <Image
                source={{ uri: item.artworkUrl100 }}
                style={styles.artwork}
            />
            <View style={styles.resultText}>
                <Text variant="titleMedium" numberOfLines={1} style={{ color: theme.colors.onSurface }}>{item.trackName}</Text>
                <Text variant="bodyMedium" numberOfLines={1} style={{ color: theme.colors.onSurfaceVariant }}>{item.artistName}</Text>
            </View>
            <TouchableOpacity
                onPress={() => onAddPress(item)}
                style={[styles.addButton, { backgroundColor: theme.colors.secondaryContainer }]}
            >
                <IconButton icon="plus" iconColor={theme.colors.onSecondaryContainer} size={20} />
            </TouchableOpacity>
        </Surface>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <Text variant="displaySmall" style={{ color: theme.colors.primary, fontWeight: 'bold', marginBottom: 16 }}>Find Music</Text>
                <Searchbar
                    placeholder="Search Artist or Song"
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    // onSubmitEditing is no longer strictly necessary but good for instant "Go"
                    onSubmitEditing={() => setDebouncedQuery(searchQuery)}
                    style={[styles.searchBar, { backgroundColor: theme.colors.elevation.level2 }]}
                    inputStyle={{ color: theme.colors.onSurface }}
                    iconColor={theme.colors.onSurfaceVariant}
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator animating={true} size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={results}
                    keyExtractor={(item) => item.trackId.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    keyboardShouldPersistTaps="handled"
                    ListEmptyComponent={
                        !loading && searchQuery ? (
                            <View style={styles.center}>
                                <Text style={{ color: theme.colors.onSurfaceVariant }}>No results found</Text>
                            </View>
                        ) : null
                    }
                />
            )}

            <Portal>
                <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)} style={{ backgroundColor: theme.colors.elevation.level3, borderRadius: 14, width: '80%', alignSelf: 'center' }}>
                    <Dialog.Title style={{ color: theme.colors.onSurface, textAlign: 'center', fontWeight: 'bold' }}>Add to Library</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                            Have you already learned "{selectedTrack?.trackName}"?
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions style={{ flexDirection: 'column', padding: 0 }}>
                        <TouchableOpacity onPress={() => confirmAddSong('WANT_TO_LEARN')} style={{ width: '100%', paddingVertical: 12, borderTopWidth: 0.5, borderColor: '#333', alignItems: 'center' }}>
                            <Text style={{ color: theme.colors.primary, fontSize: 17 }}>Want to Learn</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => confirmAddSong('LEARNED')} style={{ width: '100%', paddingVertical: 12, borderTopWidth: 0.5, borderColor: '#333', alignItems: 'center' }}>
                            <Text style={{ color: theme.colors.primary, fontSize: 17 }}>Learned</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setDialogVisible(false)} style={{ width: '100%', paddingVertical: 12, borderTopWidth: 0.5, borderColor: '#333', alignItems: 'center' }}>
                            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 17 }}>Cancel</Text>
                        </TouchableOpacity>
                    </Dialog.Actions>
                </Dialog>

                <Snackbar
                    visible={snackbarVisible}
                    onDismiss={() => setSnackbarVisible(false)}
                    duration={3000}
                    wrapperStyle={{ bottom: 100, zIndex: 9999 }} // clear floating tab bar
                    action={{
                        label: 'OK',
                        onPress: () => setSnackbarVisible(false),
                    }}
                >
                    {snackbarMessage}
                </Snackbar>
            </Portal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 20,
        paddingBottom: 10,
    },
    searchBar: {
        borderRadius: 12,
        elevation: 0,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
        paddingTop: 0,
        paddingBottom: 130, // Increased to clear floating tab bar
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginBottom: 12,
        borderRadius: 16,
        overflow: 'hidden',
    },
    artwork: {
        width: 56,
        height: 56,
        borderRadius: 8,
    },
    resultText: {
        flex: 1,
        marginLeft: 16,
        marginRight: 8,
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default SearchScreen;
