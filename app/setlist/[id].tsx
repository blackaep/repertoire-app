import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, useTheme, IconButton, Card, Title, Paragraph, FAB } from 'react-native-paper';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSetlistSongs, getSetlists, removeSongFromSetlist } from '../../src/db/db';
import { Song, Setlist } from '../../src/types';

export default function SetlistDetailScreen() {
    const { id } = useLocalSearchParams();
    const [songs, setSongs] = useState<Song[]>([]);
    const [setlistName, setSetlistName] = useState('');
    const theme = useTheme();
    const router = useRouter();

    const loadData = async () => {
        if (typeof id !== 'string') return;

        // Get setlist name (optimization: could pass param, but fetching is safer)
        const allSetlists = await getSetlists();
        const current = allSetlists.find(s => s.id === id);
        if (current) setSetlistName(current.name);

        const data = await getSetlistSongs(id);
        setSongs(data);
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const handleRemoveSong = async (songId: string) => {
        if (typeof id !== 'string') return;
        await removeSongFromSetlist(id, songId);
        setSongs(prev => prev.filter(s => s.id !== songId));
    };

    const renderItem = ({ item, index }: { item: Song; index: number }) => (
        <TouchableOpacity onPress={() => router.push(`/song/${item.id}`)} activeOpacity={0.8}>
            <Card style={[styles.card, { backgroundColor: theme.colors.elevation.level2 }]} mode="elevated">
                <Card.Content style={styles.cardContent}>
                    <View style={styles.row}>
                        <View style={[styles.numberBox, { backgroundColor: theme.colors.surfaceVariant }]}>
                            <Text style={{ fontWeight: 'bold', color: theme.colors.onSurfaceVariant }}>{index + 1}</Text>
                        </View>
                        <View style={styles.textContainer}>
                            <Title numberOfLines={1} style={{ color: theme.colors.onSurface }}>{item.title}</Title>
                            <Paragraph numberOfLines={1} style={{ color: theme.colors.onSurfaceVariant }}>{item.artist}</Paragraph>
                        </View>
                        <IconButton
                            icon="minus-circle-outline"
                            iconColor={theme.colors.error}
                            size={24}
                            onPress={() => handleRemoveSong(item.id)}
                        />
                    </View>
                </Card.Content>
            </Card>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom', 'left', 'right']}>
            <Stack.Screen options={{
                headerShown: true,
                title: setlistName || 'Setlist',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: theme.colors.primary,
            }} />

            <FlatList
                data={songs}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                            No songs in this setlist yet.
                        </Text>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                            Go to a song and tap "Add to Setlist".
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    list: {
        padding: 16,
    },
    card: {
        marginBottom: 12,
        borderRadius: 12,
    },
    cardContent: {
        paddingVertical: 4,
        paddingHorizontal: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    numberBox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    }
});
