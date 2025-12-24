/**
 * Theme colors matching the client UI
 * Based on client/src/index.css color palette
 */

import { Platform } from 'react-native';

// Client UI Color Palette
export const Colors = {
  // Background colors
  bgPrimary: '#001D22',      // Background - darkest
  bgSecondary: '#122D32',    // Surface/Cards - darker
  bgTertiary: '#263F43',     // Elevated components - medium
  accent: '#475C5F',         // Highlights/interactive - lighter
  
  // Text colors for dark backgrounds
  textLight: '#ffffff',
  textMutedLight: 'rgba(255, 255, 255, 0.8)',
  textSubtleLight: 'rgba(255, 255, 255, 0.6)',
  
  // Status colors
  success: '#4ade80',
  danger: '#f87171',
  warning: '#fbbf24',
  info: '#60a5fa',
  
  // Border
  border: 'rgba(255, 255, 255, 0.1)',
  
  // Legacy support
  light: {
    text: '#11181C',
    background: '#fff',
    tint: '#0a7ea4',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#0a7ea4',
  },
  dark: {
    text: '#ECEDEE',
    background: '#001D22',
    tint: '#475C5F',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#475C5F',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
