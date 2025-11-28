# GPS Route Tracker - Design Guidelines

## Architecture Decisions

### Authentication
**No Authentication Required**
- This is a single-user utility app for individual workers
- Data stored locally on device
- Include a Profile tab with:
  - Worker avatar (generate 1 professional worker-themed preset avatar)
  - Worker name/ID field
  - App preferences (units: km/miles, allowance rate per km/mile)

### Navigation Structure
**Tab Navigation (4 tabs)**
- Home (active trip tracking & today's summary)
- History (past trips)
- Reports (summaries & exports)
- Profile (settings & worker info)

**Core Action**: Floating Action Button (FAB) for primary trip controls
- Position: Bottom-right corner, above tab bar
- Dynamic states:
  - No active trip: "Start Trip" (green)
  - Active trip: "End Trip" (red)

**Modal Screens**:
- Site Visit Entry (slide-up modal during active trip)
- Trip Details (full-screen from history)
- Report Settings (full-screen from reports)

---

## Screen Specifications

### 1. Home Screen
**Purpose**: Display current trip status and today's statistics

**Layout**:
- Header: Custom transparent header with date and "Today" title
  - Right button: Info icon (explains how distance is calculated)
- Main content: Scrollable
  - Top inset: headerHeight + Spacing.xl
  - Bottom inset: tabBarHeight + Spacing.xxl (extra space for FAB)

**Components**:
1. **Stats Cards** (top section):
   - Total Distance Today (large, prominent number with unit)
   - Travel Allowance Earned (currency format)
   - Cards use subtle elevation, not heavy shadows
   
2. **Active Trip Indicator** (when trip running):
   - Live elapsed time
   - Current distance this trip
   - Pulsing location dot icon
   - Background: subtle accent color fill
   
3. **Timeline View**:
   - Vertical timeline with dots and connecting lines
   - Events: "Left Home" → "Arrived Site A" → "Departed Site A" → etc.
   - Each event shows time and optional location name
   - Use Material Design timeline pattern
   
4. **Quick Actions** (when trip active):
   - Large button: "Record Site Arrival"
   - Large button: "Record Site Departure"
   - Full-width, minimum 56dp height, rounded corners

**FAB Specification**:
- Size: 56dp diameter
- Position: 16dp from right, 72dp from bottom (16dp above tab bar)
- Shadow: shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.10, shadowRadius: 2
- Icon: Play icon (start) / Stop icon (end)

### 2. History Screen
**Purpose**: View all past trips

**Layout**:
- Header: Default navigation header with "Trip History" title
  - Right button: Filter icon
- Main content: FlatList
  - Top inset: Spacing.xl
  - Bottom inset: tabBarHeight + Spacing.xl

**Components**:
- Trip cards (list items):
  - Date (prominent)
  - Total distance
  - Duration
  - Number of site visits
  - Route preview (simple line connecting start/end points on mini map if feasible, otherwise just icons)
  - Tap to view full trip details
  - Card style: outlined, not elevated

### 3. Reports Screen
**Purpose**: View summaries and export data

**Layout**:
- Header: Default navigation header with "Reports" title
  - Right button: Share/Export icon
- Main content: Scrollable
  - Top inset: Spacing.xl
  - Bottom inset: tabBarHeight + Spacing.xl

**Components**:
1. Date range selector (top)
2. Summary metrics:
   - Total trips
   - Total distance
   - Total allowance
   - Average distance per trip
3. Export button (full-width)
4. Optional: Simple bar chart showing distance per day

### 4. Profile Screen
**Purpose**: Worker info and app settings

**Layout**:
- Header: Default navigation header with "Profile" title
- Main content: Scrollable form
  - Top inset: Spacing.xl
  - Bottom inset: tabBarHeight + Spacing.xl

**Components**:
1. Avatar picker (circular, 80dp, centered at top)
2. Form fields:
   - Worker Name
   - Worker ID (optional)
3. Settings section:
   - Unit preference (km/miles toggle)
   - Allowance rate (number input with currency)
   - GPS update frequency (Low/Medium/High)
4. App info footer

### 5. Site Visit Modal
**Purpose**: Quick entry for site arrival/departure

**Layout**:
- Modal slide-up from bottom (70% screen height)
- Header: "Record Site Visit" with close button
- Main content: Form
  - Bottom submit button

**Components**:
- Auto-captured: Time, GPS coordinates
- User inputs:
  - Site name (text input)
  - Notes (multiline text input, optional)
- Large "Save" button at bottom

---

## Design System

### Color Palette
**Primary**: 
- Green (#4CAF50) - for active/start actions
- Dark Green (#388E3C) - pressed state

**Secondary**: 
- Red (#F44336) - for end/stop actions
- Dark Red (#D32F2F) - pressed state

**Neutral**:
- Background: #FAFAFA (light gray)
- Card background: #FFFFFF
- Text primary: #212121
- Text secondary: #757575
- Dividers: #E0E0E0

**Accent**:
- Blue (#2196F3) - for info, links
- Light Blue (#E3F2FD) - for active trip background

### Typography
- **Headline**: 32sp, bold (today's distance)
- **Title**: 20sp, medium (screen titles)
- **Body**: 16sp, regular (main text)
- **Caption**: 14sp, regular (timestamps, labels)
- **Button Text**: 16sp, medium, uppercase

### Spacing Scale
- xs: 4dp
- sm: 8dp
- md: 16dp
- lg: 24dp
- xl: 32dp
- xxl: 48dp

### Component Specifications

**Cards**:
- Padding: Spacing.md
- Border radius: 8dp
- Border: 1dp solid #E0E0E0
- NO drop shadow (use outline style)

**Buttons**:
- Height: 56dp minimum (extra large for worker-friendly tapping)
- Border radius: 8dp
- Pressed state: Darken by 10%, scale to 0.98
- Disabled state: Opacity 0.5

**Timeline Dots**:
- Size: 16dp diameter
- Connecting line: 2dp width
- Active dot: Filled circle
- Past dots: Outlined circle

**FAB**:
- Exactly as specified above in Home Screen section

---

## Interaction Design

### Trip Flow
1. User taps FAB "Start Trip" → Immediate GPS capture → FAB changes to "End Trip" → Timeline shows "Left Home"
2. During trip: "Record Site Arrival" button appears → Opens modal → Save → Timeline updates
3. User taps FAB "End Trip" → Confirmation dialog → Calculate final distance → Show summary toast

### Visual Feedback
- All buttons: Ripple effect on press (Android standard)
- FAB: Scale animation on press
- Active trip indicator: Subtle pulse animation (1.5s cycle)
- GPS logging: Small dot icon blinks every 5 seconds

### Loading States
- Distance calculation: Show shimmer on stats cards
- GPS acquiring: "Acquiring GPS..." text with spinner
- Background tracking: Persistent notification (system design)

---

## Accessibility

### Requirements
- All touchable elements: Minimum 48dp x 48dp
- Color contrast ratio: 4.5:1 for text
- FAB and action buttons: Content descriptions for screen readers
- Timeline events: Semantic grouping for TalkBack
- Form inputs: Proper labels and hints
- Distance/time values: Announce updates to screen readers when changed

---

## Critical Assets

**Generate**:
1. Worker avatar (1 preset) - Illustration style, professional worker with safety vest/hardhat, friendly, neutral expression

**System Icons** (use Material Icons):
- play_arrow (start trip)
- stop (end trip)
- location_on (site markers)
- timeline (timeline view)
- history (trip history)
- assessment (reports)
- person (profile)
- info (information)
- filter_list (filter)
- share (export)

No custom imagery needed beyond the worker avatar. Keep UI clean and functional.