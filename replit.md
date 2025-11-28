# RouteTracker - GPS Route Tracking App

## Overview
RouteTracker is a mobile application designed for workers to track their actual travel routes using continuous GPS logging and calculate total distance based on the real path traveled (not just straight-line distance between points). It calculates travel allowances automatically based on configurable rates.

## Current State
- Fully functional MVP with GPS route tracking
- Local data persistence using AsyncStorage
- iOS/Android compatible via Expo Go
- Web preview available for testing

## Project Architecture

### Stack
- **Framework**: React Native with Expo SDK 54
- **Navigation**: React Navigation 7 with bottom tabs
- **State Management**: React Context + Custom Hooks
- **Storage**: SQLite (native) + AsyncStorage (web fallback)
- **Location**: expo-location for GPS tracking
- **Maps**: react-native-maps (native) with web fallback
- **Media**: expo-image-picker for photo capture

### Directory Structure
```
/
├── App.tsx                   # Root component with providers
├── app.json                  # Expo configuration
├── assets/images/            # App icons and images
├── components/               # Reusable UI components
│   ├── ActionButton.tsx      # Large action buttons
│   ├── ActiveTripCard.tsx    # Shows active trip status
│   ├── Card.tsx              # Base card component
│   ├── EmptyState.tsx        # Empty state display
│   ├── ErrorBoundary.tsx     # Error handling wrapper
│   ├── ErrorFallback.tsx     # Error UI component
│   ├── FAB.tsx               # Floating action button
│   ├── HeaderTitle.tsx       # Custom header with logo
│   ├── SettingsItem.tsx      # Settings list item
│   ├── StatCard.tsx          # Stats display card
│   ├── TimelineEvent.tsx     # Timeline event with photo support
│   ├── TripCard.tsx          # Trip history card
│   ├── TripMap.native.tsx    # Native map with MapView (iOS/Android)
│   └── TripMap.web.tsx       # Web fallback for maps
├── constants/theme.ts        # Design tokens and colors
├── context/TripContext.tsx   # Trip state context provider
├── hooks/
│   ├── useTrip.ts            # Trip management hook
│   ├── useScreenInsets.ts    # Safe area hook
│   └── useTheme.ts           # Theme hook
├── navigation/               # Navigation configuration
│   ├── MainTabNavigator.tsx  # Bottom tab navigator
│   ├── HomeStackNavigator.tsx
│   ├── HistoryStackNavigator.tsx
│   ├── ReportsStackNavigator.tsx
│   └── ProfileStackNavigator.tsx
├── screens/                  # Screen components
│   ├── HomeScreen.tsx        # Main tracking screen
│   ├── HistoryScreen.tsx     # Trip history list
│   ├── ReportsScreen.tsx     # Statistics and reports
│   ├── ProfileScreen.tsx     # User settings
│   ├── TripDetailsScreen.tsx # Individual trip details
│   └── SiteVisitModal.tsx    # Site visit recording
└── utils/
    ├── storage.ts            # Data types, Haversine formula, formatters
    ├── database.ts           # SQLite database operations (native)
    └── dataAccess.ts         # Unified data layer (SQLite + AsyncStorage)
```

### Key Features
1. **Trip Tracking**: Start/end trips with GPS location capture
2. **Continuous GPS Logging**: Records coordinates during active trips
3. **Distance Calculation**: Uses Haversine formula on sequential GPS points
4. **Site Visits**: Record arrival/departure at work sites with photos
5. **Photo Documentation**: Attach photos to site visits for proof of arrival
6. **Route Visualization**: Interactive maps showing travel routes (native platforms)
7. **Timeline View**: Visual timeline of trip events with embedded photos
8. **Travel Allowance**: Automatic calculation with advanced rate settings
9. **Trip History**: View all past trips with details
10. **Reports**: Statistics with daily/weekly/monthly views and CSV export
11. **Settings**: Configurable units, rates, GPS frequency, and allowance rules

## User Preferences
- Distance units: Kilometers (default) or Miles
- Allowance rate: Configurable per km/mile
- GPS update frequency: Low (30s), Medium (15s), High (5s)
- Advanced Allowance Settings:
  - Rate Per Mile: Used for US/Imperial units (default $0.80)
  - Min Distance for Allowance: Minimum travel distance before allowance applies
  - Max Daily Allowance: Cap on total daily travel reimbursement

## Recent Changes
- Initial MVP implementation (November 2024)
- Generated app icon and worker avatar
- Implemented all 4 tabs: Today, History, Reports, Profile
- Added real-time GPS tracking with Haversine distance calculation
- Local storage persistence for trips, GPS points, site visits
- Added SQLite database support for native platforms (expo-sqlite)
- Implemented platform-specific TripMap component (TripMap.native.tsx / TripMap.web.tsx)
- Added photo attachment functionality for site visits using expo-image-picker
- Implemented advanced allowance settings:
  - Rate per mile (for US/Imperial units)
  - Minimum distance threshold for allowance
  - Maximum daily allowance cap
- Updated ProfileScreen with Extended Allowance Settings section
- CSV export now available for trip data

## Running the App
- **Development**: `npm run dev` starts Expo development server
- **Testing**: Scan QR code with Expo Go app on physical device
- **Web Preview**: Available at localhost:8081 (limited GPS features)

## Notes
- GPS tracking works best on physical devices via Expo Go
- Web version shows fallback messages for GPS-dependent features
- Background location tracking available on iOS/Android only
