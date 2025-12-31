import { MD3DarkTheme as PaperDarkTheme } from 'react-native-paper';
import { MD3Theme } from 'react-native-paper/lib/typescript/types';

// Predefined Color Palettes
export const AppColors = {
    Orange: '#ff8c42ff',
    Red: '#FF5252',
    Green: '#69F0AE',
    Blue: '#448AFF',
    Purple: '#E040FB',
    Pink: '#FF4081',
    Teal: '#64FFDA',
    Yellow: '#FFD740',
};

export type AppColorType = keyof typeof AppColors;

export const createTheme = (primaryColor: string): MD3Theme => {
    return {
        ...PaperDarkTheme,
        colors: {
            ...PaperDarkTheme.colors,
            primary: primaryColor,
            primaryContainer: primaryColor, // Simplified for now
            secondary: primaryColor, // Monochromatic feel
            secondaryContainer: primaryColor,
            tertiary: primaryColor,
            tertiaryContainer: primaryColor,

            // Greys instead of Black
            background: '#1A1A1A', // Dark Grey
            surface: '#2D2D2D',    // Lighter Grey
            surfaceVariant: '#404040',

            error: '#CF6679',

            onPrimary: '#000000', // Dark text on bright primary
            onSecondary: '#000000',
            onBackground: '#E0E0E0',
            onSurface: '#E0E0E0',
            onSurfaceVariant: '#C2C2C2',

            elevation: {
                level0: 'transparent',
                level1: '#2D2D2D',
                level2: '#333333',
                level3: '#383838',
                level4: '#3D3D3D',
                level5: '#424242',
            },
        },
        roundness: 16,
    };
};

// Default theme for initial load
export const theme = createTheme(AppColors.Orange);
