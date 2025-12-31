import React, { createContext, useContext, useState, useEffect } from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { createTheme, AppColors, AppColorType } from '../theme';

type PreferencesContextType = {
    colorName: AppColorType;
    setColorName: (color: AppColorType) => void;
    keepScreenAwake: boolean;
    setKeepScreenAwake: (enabled: boolean) => void;
    hapticsEnabled: boolean;
    setHapticsEnabled: (enabled: boolean) => void;
};

const PreferencesContext = createContext<PreferencesContextType>({
    colorName: 'Orange',
    setColorName: () => { },
    keepScreenAwake: false,
    setKeepScreenAwake: () => { },
    hapticsEnabled: false,
    setHapticsEnabled: () => { },
});

export const useAppPreferences = () => useContext(PreferencesContext);

export const PreferencesProvider = ({ children }: { children: React.ReactNode }) => {
    const [colorName, setColorNameState] = useState<AppColorType>('Orange');
    const [keepScreenAwake, setKeepScreenAwakeState] = useState(false);
    const [hapticsEnabled, setHapticsEnabledState] = useState(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const loadPreferences = async () => {
            try {
                const nav = await AsyncStorage.multiGet(['user_theme_color', 'pref_keep_awake', 'pref_haptics']);
                const savedColor = nav[0][1];
                const savedKeepAwake = nav[1][1];
                const savedHaptics = nav[2][1];

                if (savedColor && Object.keys(AppColors).includes(savedColor)) {
                    setColorNameState(savedColor as AppColorType);
                }
                if (savedKeepAwake !== null) setKeepScreenAwakeState(savedKeepAwake === 'true');
                if (savedHaptics !== null) setHapticsEnabledState(savedHaptics === 'true');

            } catch (e) {
                console.error('Failed to load preferences', e);
            } finally {
                setIsReady(true);
            }
        };
        loadPreferences();
    }, []);

    // Side effect for Keep Awake
    useEffect(() => {
        if (keepScreenAwake) {
            activateKeepAwakeAsync();
        } else {
            deactivateKeepAwake();
        }
    }, [keepScreenAwake]);

    const setColorName = async (color: AppColorType) => {
        setColorNameState(color);
        await AsyncStorage.setItem('user_theme_color', color);
    };

    const setKeepScreenAwake = async (enabled: boolean) => {
        setKeepScreenAwakeState(enabled);
        await AsyncStorage.setItem('pref_keep_awake', String(enabled));
    };

    const setHapticsEnabled = async (enabled: boolean) => {
        setHapticsEnabledState(enabled);
        await AsyncStorage.setItem('pref_haptics', String(enabled));
    };

    const theme = createTheme(AppColors[colorName]);

    if (!isReady) {
        return null;
    }

    return (
        <PreferencesContext.Provider value={{
            colorName, setColorName,
            keepScreenAwake, setKeepScreenAwake,
            hapticsEnabled, setHapticsEnabled
        }}>
            <PaperProvider theme={theme}>
                {children}
            </PaperProvider>
        </PreferencesContext.Provider>
    );
};
