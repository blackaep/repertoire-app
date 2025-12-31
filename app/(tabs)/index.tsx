import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Surface, useTheme, ActivityIndicator, Button, Card, Avatar, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppPreferences } from '../../src/context/PreferencesContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { getPracticeStats, getSongSuggestion, getSongs } from '../../src/db/db';
import { Song } from '../../src/types';

export default function DashboardScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { colorName } = useAppPreferences();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ currentStreak: 0, lastSevenDays: [] as any[] });
    const [suggestion, setSuggestion] = useState<Song | null>(null);
    const [chartHeight, setChartHeight] = useState(0);

    const loadData = async () => {
        try {
            const s = await getPracticeStats();
            setStats(s);
            const sug = await getSongSuggestion();
            setSuggestion(sug);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 5) return 'Burning the midnight oil?';
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    // Simple Chart Logic
    const maxVal = Math.max(...stats.lastSevenDays.map(d => d.value), 10); // Min scale 10 mins

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <ScrollView contentContainerStyle={styles.content}>

                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>{getGreeting()}</Text>
                        <Text style={styles.subGreeting}>Ready to practice?</Text>
                    </View>
                </View>

                <Surface style={[styles.card, { backgroundColor: theme.colors.elevation.level1, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }]} elevation={0}>
                    <View style={styles.streakRow}>
                        <MaterialCommunityIcons name="fire" size={40} color={stats.currentStreak > 0 ? theme.colors.error : theme.colors.surfaceDisabled} />
                        <View style={{ marginLeft: 16 }}>
                            <Text variant="displaySmall" style={{ color: theme.colors.onSurface, fontWeight: 'bold', lineHeight: 40 }}>{stats.currentStreak} Day{stats.currentStreak !== 1 ? 's' : ''}</Text>
                            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Current Streak</Text>
                        </View>
                    </View>
                </Surface>

                {/* Weekly Chart */}
                <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Weekly Practice</Text>
                <Surface style={[styles.card, { backgroundColor: theme.colors.elevation.level1, paddingVertical: 10, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }]} elevation={0}>
                    <View style={styles.chartContainer}>
                        {stats.lastSevenDays.map((day, index) => {
                            const heightPct = (day.value / maxVal) * 100;
                            return (
                                <View key={index} style={styles.barColumn}>
                                    <View style={{ height: 100, justifyContent: 'flex-end', width: '100%', alignItems: 'center' }}>
                                        <View style={{
                                            width: 8,
                                            height: `${Math.max(heightPct, 5)}%`, // Min height for visibility
                                            backgroundColor: day.value > 0 ? theme.colors.primary : theme.colors.surfaceVariant,
                                            borderRadius: 4
                                        }} />
                                    </View>
                                    <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 10, marginTop: 4 }}>{day.label}</Text>
                                </View>
                            );
                        })}
                    </View>
                </Surface>

                {/* Song of the Day */}
                <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Song of the Day</Text>
                {suggestion ? (
                    <Card style={[styles.card, { backgroundColor: theme.colors.elevation.level1, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }]} elevation={0} onPress={() => router.push(`/song/${suggestion.id}`)}>
                        <Card.Title
                            title={suggestion.title}
                            subtitle={suggestion.artist}
                            titleStyle={{ fontWeight: 'bold', fontSize: 18 }}
                            left={(props) => <Avatar.Icon {...props} icon="music-note" style={{ backgroundColor: theme.colors.primary }} />}
                            right={(props) => <IconButton {...props} icon="chevron-right" />}
                        />
                        <Card.Content>
                            <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>
                                {suggestion.status === 'LEARNING' ? 'Keep pushing, you are learning this!' : 'Why not give this a spin?'}
                            </Text>
                        </Card.Content>
                    </Card>
                ) : (
                    <Card style={[styles.card, { backgroundColor: theme.colors.elevation.level1, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }]} elevation={0} onPress={() => router.push('/(tabs)/search')}>
                        <Card.Title
                            title="Add a Song"
                            subtitle="Build your repertoire to get suggestions"
                            left={(props) => <Avatar.Icon {...props} icon="plus" style={{ backgroundColor: theme.colors.secondary }} />}
                        />
                    </Card>
                )}

                {/* Quick Actions */}
                <View style={styles.actionsGrid}>
                    <Card style={[styles.actionCard, { backgroundColor: theme.colors.elevation.level1, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }]} elevation={0} onPress={() => router.push('/(tabs)/search')}>
                        <Card.Content style={styles.actionContent}>
                            <MaterialCommunityIcons name="plus-circle" size={32} color={theme.colors.primary} />
                            <Text variant="labelLarge" style={{ marginTop: 8, color: theme.colors.onSurface }}>Add Song</Text>
                        </Card.Content>
                    </Card>
                    <Card style={[styles.actionCard, { backgroundColor: theme.colors.elevation.level1, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }]} elevation={0} onPress={() => router.push('/library')}>
                        <Card.Content style={styles.actionContent}>
                            <MaterialCommunityIcons name="music-box-multiple" size={32} color={theme.colors.secondary} />
                            <Text variant="labelLarge" style={{ marginTop: 8, color: theme.colors.onSurface }}>Library</Text>
                        </Card.Content>
                    </Card>
                </View>

            </ScrollView>
        </SafeAreaView>
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
    content: {
        padding: 20,
        paddingBottom: 120, // Clears floating tab bar
        gap: 24,
    },
    header: {
        marginBottom: 24,
        paddingTop: 10,
    },
    greeting: {
        fontSize: 34,
        fontWeight: 'bold',
        color: '#FFF',
        letterSpacing: 0.3,
    },
    subGreeting: {
        fontSize: 18,
        color: '#AAA',
        marginTop: 4,
    },
    card: {
        padding: 20,
        borderRadius: 20, // More rectangular
    },
    streakRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sectionTitle: {
        fontWeight: 'bold',
        fontSize: 22, // Larger
        letterSpacing: 0.3,
        marginBottom: -4,
    },
    chartContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 120,
        paddingHorizontal: 10
    },
    barColumn: {
        alignItems: 'center',
        flex: 1,
    },
    actionsGrid: {
        flexDirection: 'row',
        gap: 16,
    },
    actionCard: {
        flex: 1,
        borderRadius: 12,
    },
    actionContent: {
        alignItems: 'center',
        paddingVertical: 16,
    }
});
