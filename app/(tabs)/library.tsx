import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Image } from 'react-native';
import { Text, FAB, Chip, Searchbar, useTheme, Surface, IconButton, ActivityIndicator, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { getSongs, deleteSong } from '../../src/db/db';
import { Song } from '../../src/types';
import { Swipeable } from 'react-native-gesture-handler';

const INSTRUMENTS = ['Acoustic', 'Electric', 'Bass', 'Classical', 'Piano'];

export default function LibraryScreen() {
    const theme = useTheme();
    const router = useRouter();
    const [songs, setSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>('learning'); // 'learning' | 'learned'

    const loadSongs = async () => {
        try {
            const loadedSongs = await getSongs();
            setSongs(loadedSongs);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadSongs();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadSongs();
    };

    const handleDelete = async (id: string) => {
        await deleteSong(id);
        loadSongs();
    };

    const toggleInstrument = (instrument: string) => {
        if (selectedInstruments.includes(instrument)) {
            setSelectedInstruments(prev => prev.filter(i => i !== instrument));
        } else {
            setSelectedInstruments(prev => [...prev, instrument]);
        }
    };

    const filteredSongs = songs.filter(s => {
        // Status Filter
        if (statusFilter === 'learned') {
            if (s.status !== 'LEARNED') return false;
        } else {
            // 'learning' includes WANT_TO_LEARN and LEARNING
            if (s.status === 'LEARNED') return false;
        }

        // Instrument Filter
        if (selectedInstruments.length > 0) {
            if (!s.instrument || !selectedInstruments.includes(s.instrument)) return false;
        }

        return true;
    });

    const renderRightActions = (id: string) => {
        return (
            <View style={styles.deleteAction}>
                <IconButton
                    icon="delete"
                    iconColor="white"
                    onPress={() => handleDelete(id)}
                />
            </View>
        );
    };

    const renderItem = ({ item }: { item: Song }) => (
        <Swipeable renderRightActions={() => renderRightActions(item.id)}>
            <Surface style={[styles.card, { backgroundColor: theme.colors.elevation.level1 }]} elevation={1}>
                <View style={styles.cardContent} onTouchEnd={() => router.push(`/song/${item.id}`)}>
                    {item.albumArt ? (
                        <Image source={{ uri: item.albumArt }} style={styles.albumArt} />
                    ) : (
                        <View style={[styles.albumArt, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}>
                            <MaterialCommunityIcons name="music-note" size={24} color="#666" />
                        </View>
                    )}
                    <View style={styles.textContainer}>
                        <Text variant="titleMedium" numberOfLines={1} style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>{item.title}</Text>
                        <Text variant="bodyMedium" numberOfLines={1} style={{ color: theme.colors.onSurfaceVariant }}>{item.artist}</Text>
                    </View>
                    <View style={styles.metaContainer}>
                        {/* Show status icon only if mixed or specific logic needed, mostly hidden by tab now */}
                        {item.status === 'LEARNED' && (
                            <MaterialCommunityIcons name="check-circle" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
                        )}
                        {item.status === 'LEARNING' && (
                            <MaterialCommunityIcons name="progress-clock" size={20} color={theme.colors.tertiary} style={{ marginRight: 8 }} />
                        )}
                        {item.instrument && (
                            <View style={[styles.tag, { backgroundColor: theme.colors.primary }]}>
                                <Text style={styles.tagText}>{item.instrument}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </Surface>
        </Swipeable>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: '#1A1A1A' }]} edges={['top']}>
            <View style={styles.header}>
                <Text style={[styles.largeTitle, { color: theme.colors.primary }]}>Repertoire</Text>

                {/* Custom Tabs */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tabButton, statusFilter === 'learning' ? { backgroundColor: theme.colors.primary } : { backgroundColor: '#333' }]}
                        onPress={() => setStatusFilter('learning')}
                    >
                        <Text style={[styles.tabText, { color: statusFilter === 'learning' ? '#000' : '#FFF' }]}>Want to Learn</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabButton, statusFilter === 'learned' ? { backgroundColor: theme.colors.primary } : { backgroundColor: '#333' }]}
                        onPress={() => setStatusFilter('learned')}
                    >
                        <Text style={[styles.tabText, { color: statusFilter === 'learned' ? '#000' : '#FFF' }]}>Learned</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Filter Chips */}
            <View style={styles.filterContainer}>
                <FlatList
                    horizontal
                    data={INSTRUMENTS}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
                    renderItem={({ item }) => (
                        <Chip
                            selected={selectedInstruments.includes(item)}
                            onPress={() => toggleInstrument(item)}
                            showSelectedOverlay
                            style={{ backgroundColor: '#333', borderRadius: 20 }}
                            textStyle={{ color: '#FFF' }}
                        >
                            {item}
                        </Chip>
                    )}
                />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredSongs}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MaterialCommunityIcons name="guitar-acoustic" size={64} color="#333" style={{ marginBottom: 16 }} />
                            <Text variant="titleMedium" style={{ color: '#DDD', marginBottom: 24 }}>
                                {statusFilter === 'learned' ? "No songs mastered yet." : "No songs to learn yet."}
                            </Text>
                            <Button
                                mode="contained"
                                onPress={() => router.push('/(tabs)/search')}
                                contentStyle={{ height: 50, paddingHorizontal: 20 }}
                                labelStyle={{ fontSize: 16, fontWeight: 'bold', color: '#000' }}
                            >
                                Find Songs
                            </Button>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        paddingTop: 10,
    },
    largeTitle: {
        fontSize: 34,
        fontWeight: 'bold',
        letterSpacing: 0.3,
        marginBottom: 20,
    },
    tabContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 10,
    },
    tabButton: {
        flex: 1,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
    },
    filterContainer: {
        marginBottom: 20,
        height: 40,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 120, // Space for Fab and TabBar
        gap: 12,
    },
    card: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    cardContent: {
        flexDirection: 'row',
        padding: 12,
        alignItems: 'center',
    },
    albumArt: {
        width: 50,
        height: 50,
        borderRadius: 8,
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    metaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    tag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tagText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#000',
    },
    deleteAction: {
        backgroundColor: '#D32F2F', // Red
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: '100%',
        borderRadius: 12,
        marginLeft: 10,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100,
    }
});
