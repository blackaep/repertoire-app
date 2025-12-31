import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { Text, Surface, useTheme, Button, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppColorType, AppColors } from '../../src/theme';
import { useAppPreferences } from '../../src/context/PreferencesContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { exportData, importData } from '../../src/utils/dataTransfer'; // To be implemented next

export default function SettingsScreen() {
    const theme = useTheme();
    const { colorName, setColorName, keepScreenAwake, setKeepScreenAwake, hapticsEnabled, setHapticsEnabled } = useAppPreferences();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <Text variant="headlineMedium" style={[styles.header, { color: theme.colors.onSurface }]}>Settings</Text>

            <ScrollView contentContainerStyle={styles.content}>

                {/* General Section */}
                <Surface style={[styles.section, { backgroundColor: theme.colors.elevation.level1 }]} elevation={1}>
                    <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 16, fontWeight: 'bold' }}>General</Text>

                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>Keep Screen Awake</Text>
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Prevent screen from turning off while using the app.</Text>
                        </View>
                        <Switch
                            value={keepScreenAwake}
                            onValueChange={setKeepScreenAwake}
                            trackColor={{ false: '#767577', true: theme.colors.primary }}
                            thumbColor={keepScreenAwake ? '#fff' : '#f4f3f4'}
                        />
                    </View>

                    <Divider style={{ marginVertical: 16 }} />

                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>Haptic Feedback</Text>
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Vibrate on metronome beats.</Text>
                        </View>
                        <Switch
                            value={hapticsEnabled}
                            onValueChange={setHapticsEnabled}
                            trackColor={{ false: '#767577', true: theme.colors.primary }}
                            thumbColor={hapticsEnabled ? '#fff' : '#f4f3f4'}
                        />
                    </View>
                </Surface>

                {/* Appearance Section */}
                <Surface style={[styles.section, { backgroundColor: theme.colors.elevation.level1 }]} elevation={1}>
                    <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 16, fontWeight: 'bold' }}>Appearance</Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
                        Choose your preferred accent color.
                    </Text>

                    <View style={styles.colorGrid}>
                        {(Object.keys(AppColors) as AppColorType[]).map((color) => {
                            const isSelected = colorName === color;
                            return (
                                <TouchableOpacity
                                    key={color}
                                    onPress={() => setColorName(color)}
                                    style={[
                                        styles.colorCircle,
                                        { backgroundColor: AppColors[color] },
                                        isSelected && { borderColor: theme.colors.onSurface, borderWidth: 3 }
                                    ]}
                                >
                                    {isSelected && <MaterialCommunityIcons name="check" size={20} color="#000" />}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </Surface>

                {/* Data Section (Placeholders for now) */}
                <Surface style={[styles.section, { backgroundColor: theme.colors.elevation.level1 }]} elevation={1}>
                    <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 16, fontWeight: 'bold' }}>Data Management</Text>
                    <Button mode="outlined" icon="export" onPress={exportData} style={{ marginBottom: 10 }} textColor={theme.colors.primary}>
                        Export Library Backup
                    </Button>
                    <Button mode="outlined" icon="import" onPress={importData} textColor={theme.colors.primary}>
                        Import Library Backup
                    </Button>
                </Surface>

                {/* About Section */}
                <Surface style={[styles.section, { backgroundColor: theme.colors.elevation.level1 }]} elevation={1}>
                    <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 16, fontWeight: 'bold' }}>About</Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                        Repertoire v1.0.0
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                        Designed to help you master your music.
                    </Text>
                </Surface>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        fontWeight: 'bold',
        paddingHorizontal: 20,
        paddingBottom: 20,
        paddingTop: 10,
    },
    content: {
        padding: 20,
        gap: 20,
        paddingBottom: 100
    },
    section: {
        padding: 20,
        borderRadius: 16,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    colorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    colorCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    }
});
