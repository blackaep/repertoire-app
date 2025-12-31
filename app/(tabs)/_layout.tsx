import { Tabs } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { StyleSheet } from 'react-native';

export default function TabLayout() {
    const theme = useTheme();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    position: 'absolute',
                    bottom: 30,
                    marginHorizontal: 20,
                    backgroundColor: 'transparent',
                    borderRadius: 30,
                    borderTopWidth: 0,
                    height: 60,
                    elevation: 0, // Remove shadow for glass effect
                    shadowColor: '#000',
                    borderTopColor: 'transparent',
                },
                tabBarBackground: () => (
                    <BlurView
                        tint="dark"
                        intensity={50}
                        style={{
                            ...StyleSheet.absoluteFillObject,
                            borderRadius: 30,
                            overflow: 'hidden',
                            backgroundColor: 'rgba(30,30,30,0.5)' // Fallback / Tint
                        }}
                    />
                ),
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="home" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="library"
                options={{
                    title: 'Library',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="music-box-multiple" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="search"
                options={{
                    title: 'Search',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="magnify" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="setlists"
                options={{
                    title: 'Setlists',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="playlist-music" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="cog" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
