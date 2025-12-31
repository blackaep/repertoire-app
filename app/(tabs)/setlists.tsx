import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, FAB, Dialog, Portal, TextInput, Button, Card, IconButton, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSharedValue } from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { createSetlist, getSetlists, deleteSetlist } from '../../src/db/db';
import { Setlist } from '../../src/types';

export default function SetlistsScreen() {
    const [setlists, setSetlists] = useState<Setlist[]>([]);
    const [visible, setVisible] = useState(false);
    const [newSetName, setNewSetName] = useState('');
    const theme = useTheme();
    const router = useRouter();

    const loadSetlists = async () => {
        const data = await getSetlists();
        setSetlists(data);
    };

    useFocusEffect(
        useCallback(() => {
            loadSetlists();
        }, [])
    );

    const handleCreate = async () => {
        if (!newSetName.trim()) return;
        await createSetlist(newSetName);
        setNewSetName('');
        setVisible(false);
        loadSetlists();
    };

    const handleDelete = async (id: string) => {
        await deleteSetlist(id);
        setSetlists(prev => prev.filter(s => s.id !== id));
    };

    const renderRightActions = (item: Setlist) => (
        <TouchableOpacity
            style={styles.deleteAction}
            onPress={() => handleDelete(item.id)}
        >
            <IconButton icon="delete" iconColor="white" size={24} />
        </TouchableOpacity>
    );

    const renderItem = ({ item }: { item: Setlist }) => (
        <ReanimatedSwipeable
            renderRightActions={() => renderRightActions(item)}
            overshootRight={false}
            containerStyle={{ marginBottom: 12 }}
        >
            <TouchableOpacity onPress={() => router.push(`/setlist/${item.id}`)} activeOpacity={0.8}>
                <Card style={[styles.card, { backgroundColor: theme.colors.elevation.level2 }]} mode="elevated">
                    <Card.Content style={styles.cardContent}>
                        <View style={styles.row}>
                            <View style={[styles.iconBox, { backgroundColor: theme.colors.tertiaryContainer }]}>
                                <IconButton icon="playlist-music" iconColor={theme.colors.onTertiaryContainer} size={24} />
                            </View>
                            <View style={styles.textContainer}>
                                <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>{item.name}</Text>
                                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                    {new Date(item.createdAt).toLocaleDateString()}
                                </Text>
                            </View>
                            <IconButton icon="chevron-right" iconColor={theme.colors.onSurfaceVariant} size={24} />
                        </View>
                    </Card.Content>
                </Card>
            </TouchableOpacity>
        </ReanimatedSwipeable>
    );

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.header}>
                    <Text variant="displaySmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Setlists</Text>
                </View>

                <FlatList
                    data={setlists}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <IconButton icon="playlist-plus" size={64} iconColor={theme.colors.surfaceVariant} />
                            <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>
                                No setlists yet. Create one!
                            </Text>
                        </View>
                    }
                />

                <FAB
                    icon="plus"
                    style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                    color={theme.colors.onPrimary}
                    onPress={() => setVisible(true)}
                    label="New Setlist"
                />

                <Portal>
                    <Dialog visible={visible} onDismiss={() => setVisible(false)} style={{ backgroundColor: theme.colors.surface, borderRadius: 14, width: '80%', alignSelf: 'center' }}>
                        <Dialog.Title style={{ color: theme.colors.onSurface, textAlign: 'center', fontWeight: 'bold' }}>New Setlist</Dialog.Title>
                        <Dialog.Content>
                            <TextInput
                                label="Setlist Name"
                                value={newSetName}
                                onChangeText={setNewSetName}
                                mode="outlined"
                                autoFocus
                                theme={{ colors: { primary: theme.colors.primary, background: theme.colors.surface } }}
                                textColor={theme.colors.onSurface}
                                style={{ backgroundColor: theme.colors.surface }}
                                outlineStyle={{ borderRadius: 8 }}
                            />
                        </Dialog.Content>
                        <Dialog.Actions style={{ flexDirection: 'column', padding: 0 }}>
                            <TouchableOpacity onPress={handleCreate} style={{ width: '100%', paddingVertical: 12, borderTopWidth: 0.5, borderColor: '#333', alignItems: 'center' }}>
                                <Text style={{ color: theme.colors.primary, fontSize: 17, fontWeight: 'bold' }}>Create</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setVisible(false)} style={{ width: '100%', paddingVertical: 12, borderTopWidth: 0.5, borderColor: '#333', alignItems: 'center' }}>
                                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 17 }}>Cancel</Text>
                            </TouchableOpacity>
                        </Dialog.Actions>
                    </Dialog>
                </Portal>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 20,
    },
    list: {
        padding: 16,
        paddingBottom: 100,
    },
    card: {
        borderRadius: 16,
    },
    cardContent: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
        marginLeft: 16,
        justifyContent: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 100, // Above tab bar
    },
    deleteAction: {
        backgroundColor: '#ff4444',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: '100%',
        marginBottom: 12,
        borderRadius: 16,
        marginLeft: 10,
    },
});
