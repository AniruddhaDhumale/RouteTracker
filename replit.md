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
- **Storage**: AsyncStorage for local persistence
- **Location**: expo-location for GPS tracking

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
│   ├── TimelineEvent.tsx     # Timeline event display
│   └── TripCard.tsx          # Trip history card
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
└── utils/storage.ts          # Data storage utilities
```

### Key Features
1. **Trip Tracking**: Start/end trips with GPS location capture
2. **Continuous GPS Logging**: Records coordinates during active trips
3. **Distance Calculation**: Uses Haversine formula on sequential GPS points
4. **Site Visits**: Record arrival/departure at work sites
5. **Timeline View**: Visual timeline of trip events
6. **Travel Allowance**: Automatic calculation based on distance
7. **Trip History**: View all past trips with details
8. **Reports**: Statistics with daily/weekly/monthly views
9. **Settings**: Configurable units, rates, and GPS frequency

## User Preferences
- Distance units: Kilometers (default) or Miles
- Allowance rate: Configurable per km/mile
- GPS update frequency: Low (30s), Medium (15s), High (5s)

## Recent Changes
- Initial MVP implementation (November 2024)
- Generated app icon and worker avatar
- Implemented all 4 tabs: Today, History, Reports, Profile
- Added real-time GPS tracking with Haversine distance calculation
- Local storage persistence for trips, GPS points, site visits

## Running the App
- **Development**: `npm run dev` starts Expo development server
- **Testing**: Scan QR code with Expo Go app on physical device
- **Web Preview**: Available at localhost:8081 (limited GPS features)

## Notes
- GPS tracking works best on physical devices via Expo Go
- Web version shows fallback messages for GPS-dependent features
- Background location tracking available on iOS/Android only
