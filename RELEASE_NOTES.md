# Streall v1.0.6 Release Notes

## 🎉 Major UI/UX Improvements

### ❤️ Enhanced Watchlist Experience
- **Hero Section Integration**: Add to watchlist directly from the hero section with functional Plus/Heart button
- **Real-time Status Updates**: Watchlist buttons dynamically show current status across all components
- **Improved Button Contrast**: Much better visibility with enhanced color schemes and hover effects
- **Consistent Experience**: Unified watchlist functionality across hero, content details, and Netflix cards

### 🎨 Netflix Card Layout Fixes
- **Fixed Text Overlap**: Resolved title overlapping with SERIES/FILM badges using intelligent flexbox layout
- **Better Text Display**: Titles now show 2 lines instead of being truncated, improving readability
- **Professional Spacing**: Clean layout with proper gaps and padding between all elements
- **Responsive Design**: Cards adapt better to different screen sizes and content lengths

### 🖱️ Interactive Enhancements
- **Smart Button States**: Watchlist buttons show filled heart when item is in list, plus icon when not
- **Smooth Transitions**: All buttons now have 300ms transitions for professional feel
- **Better Hover Effects**: Enhanced visual feedback on all interactive elements
- **Tooltip Support**: Helpful tooltips for better user experience

## 🔧 Technical Improvements

### Desktop Application Stability
- **Simplified Electron Main Process**: Removed complex ad blocker initialization that was causing startup failures
- **Better Error Handling**: Added comprehensive error logging and exception handling
- **Improved Startup Reliability**: Desktop app now starts consistently without hanging
- **Debug Logging**: Enhanced console output for better troubleshooting

### Component Architecture
- **Watchlist Service Integration**: Hero component now properly integrates with watchlist service
- **State Management**: Real-time synchronization of watchlist status across components
- **ID Handling**: Improved content ID management (IMDB vs TMDB) for better compatibility
- **Performance Optimization**: Reduced unnecessary re-renders and improved component efficiency

## 🎨 Visual Design Improvements

### Button Contrast Enhancements
**Before**: Poor visibility with `border-slate-400` and `bg-black/50`
**After**: Professional contrast with:
- **Not in watchlist**: `border-white/60 bg-black/60` with white hover effects
- **In watchlist**: `border-red-500 bg-red-600/80` with red theming
- **Enhanced hover states**: Smooth color transitions and better visual feedback

### Netflix Card Layout
**Before**: Title and badges positioned independently causing overlap
**After**: Intelligent layout with:
- **Flexbox container**: `justify-between` with proper gap spacing
- **Title section**: `flex-1 min-w-0` for responsive text handling
- **Badge section**: `flex-shrink-0` for consistent positioning
- **Two-line titles**: `line-clamp-2` instead of truncation

### Gradient Improvements
- **Stronger backgrounds**: `from-black/90 via-black/60` for better text readability
- **Better badge contrast**: `bg-black/80` with backdrop blur for enhanced visibility
- **Improved hover overlays**: Enhanced gradients for better content separation

## 🚀 New Features

### Hero Section Watchlist
- **Functional Plus Button**: Previously decorative button now adds/removes from watchlist
- **Dynamic Icon Changes**: Shows Plus icon for add, filled Heart for remove
- **Instant Feedback**: Visual state changes immediately when clicked
- **Consistent Styling**: Matches design language of other watchlist buttons

### Enhanced Card Interactions
- **Better Click Areas**: Improved button sizing and positioning
- **Visual Feedback**: All buttons provide clear hover and active states
- **Accessibility**: Better contrast ratios and tooltip support
- **Mobile Optimization**: Touch-friendly button sizes and spacing

## 🐛 Bug Fixes

### Critical Desktop Fixes
- **✅ Fixed App Startup**: Resolved hanging issue caused by ad blocker initialization
- **✅ Fixed Window Display**: Desktop app now shows content properly on Windows
- **✅ Fixed Build Process**: Resolved file permission issues during distribution builds
- **✅ Fixed Console Errors**: Cleaned up cache-related warnings (non-critical)

### UI/UX Fixes
- **✅ Fixed Text Overlap**: Netflix cards no longer have title/badge overlap issues
- **✅ Fixed Button Visibility**: All watchlist buttons now have proper contrast
- **✅ Fixed Hover States**: Smooth transitions and consistent behavior
- **✅ Fixed Responsive Layout**: Cards work properly on all screen sizes

### Component Fixes
- **✅ Fixed Hero Watchlist**: Plus button now actually adds to watchlist
- **✅ Fixed State Sync**: Watchlist status updates across all components
- **✅ Fixed ID Handling**: Proper content identification for watchlist operations
- **✅ Fixed Variable Scope**: Resolved TypeScript compilation errors

## 🎯 User Experience Improvements

### Watchlist Workflow
1. **Hero Section**: Click Plus button to add featured content to watchlist
2. **Visual Feedback**: Button changes to filled heart when added
3. **Consistent Experience**: Same functionality works across all content cards
4. **Real-time Updates**: Status changes immediately without page refresh

### Visual Polish
- **Professional Animations**: Smooth 300ms transitions on all interactive elements
- **Better Color Schemes**: Enhanced contrast for accessibility and aesthetics
- **Improved Spacing**: Clean, consistent padding and margins throughout
- **Modern Design**: Netflix-inspired UI with contemporary styling

## 🛠️ Technical Details

### Architecture Improvements
- **Service Integration**: Hero component now properly uses watchlist service
- **State Management**: Efficient state updates with minimal re-renders
- **Error Handling**: Comprehensive error catching and logging
- **Type Safety**: Improved TypeScript definitions and error resolution

### Performance Enhancements
- **Reduced Bundle Size**: Removed unused ad blocker dependencies from main process
- **Faster Startup**: Simplified initialization process for quicker app launch
- **Better Memory Usage**: Optimized component lifecycle and state management
- **Improved Rendering**: Efficient DOM updates and transitions

### Cross-Platform Compatibility
- **Windows**: Fixed startup issues and improved stability
- **Web**: Maintained full compatibility with browser version
- **Responsive**: Better mobile and tablet experience
- **Accessibility**: Improved keyboard navigation and screen reader support

## 📋 Installation

### Desktop Application
Download from [GitHub Releases](https://github.com/Zacxxx/streall/releases/tag/v1.0.6):
- **Windows**: `Streall-1.0.6-win.zip` (Portable)
- **macOS**: `Streall-1.0.6-mac.dmg` (Installer)

### Web Application
Visit the hosted version or run locally:
```bash
git clone https://github.com/Zacxxx/streall.git
cd streall
npm install
npm run dev
```

## 🔄 Upgrade Notes

- **Existing Users**: All watchlists and settings preserved
- **Desktop Users**: Improved stability and functionality
- **No Breaking Changes**: All existing features continue to work
- **Enhanced Experience**: Better UI/UX without losing functionality

## 🚀 What's Next

- **Re-enable Ad Blocker**: Optional ad blocking with timeout handling
- **Enhanced Animations**: More sophisticated UI transitions
- **Advanced Watchlist**: Categories, tags, and better organization
- **Performance**: Further optimizations and bundle size reduction

---

**Note**: This release focuses on stability, user experience, and visual polish. The desktop application now works reliably on Windows, and the watchlist experience is significantly improved across all platforms.

---

# Streall v1.0.5 Release Notes

## 🐛 Critical Bug Fixes

### Desktop Application Fixes
- **Fixed JavaScript Syntax Error**: Resolved crash on startup caused by syntax error in main Electron process
- **Fixed App Icon**: Windows executable now displays correct Streall icon instead of default Electron icon
- **Improved Build Configuration**: Updated electron-builder to use proper .ico format for Windows builds

### Technical Improvements
- **Electron Main Process**: Fixed syntax error that prevented desktop app from launching
- **Icon Configuration**: Proper icon formats for different platforms (.ico for Windows, .png for macOS)
- **Build Stability**: Enhanced build process reliability and error handling

---

# Streall v1.0.4 Release Notes

## 🎉 Major New Features

### 👤 Local User System
- **Create Local Profiles**: No registration required - create a profile with just your name
- **Profile Management**: Full profile page with editing capabilities and statistics
- **User Preferences**: Save your settings and preferences locally
- **Account Statistics**: Track your account age, watchlist size, and activity

### 📱 Enhanced User Experience
- **English Interface**: Complete translation from French to English
- **Improved Navigation**: Better responsive design and navbar title display
- **Profile Integration**: Access profile and settings from multiple locations
- **Open Source Focused**: Removed premium/subscription elements

### 🔧 Technical Improvements
- **Cross-Platform Storage**: Local storage for web, file-based for desktop
- **Better Responsive Design**: Fixed navbar title blocking issues
- **Improved Footer**: Platform-aware information and open source branding

## 🆕 What's New

### User System Features
- Create a local profile with name and optional email
- Personal profile page with avatar, statistics, and preferences
- Account management with safe profile deletion
- User authentication state management
- Watchlist integration with user profiles

### Interface Improvements
- Footer completely redesigned in English
- Removed social media and premium content
- Added platform detection (Desktop vs Web)
- GitHub link and open source information
- Better mobile navigation experience

### Navigation Enhancements
- Fixed navbar title display on all screen sizes
- Improved responsive breakpoints
- Better profile dropdown with user information
- Seamless profile creation flow

## 🛠️ Technical Details

### Platform Support
- **Desktop**: Electron app with local file storage (planned)
- **Web**: Browser-based with localStorage
- **Cross-Platform**: Unified codebase for both platforms

### Data Storage
- All user data stored locally on device
- No external servers or databases required
- Privacy-focused approach with local-only storage
- Easy backup and restore functionality

### User Privacy
- No registration or sign-up required
- No data collection or tracking
- All information stays on your device
- Optional email field for profile completeness

## 🔧 Developer Features

### Enhanced Services
- **AuthService**: Complete local user management system
- **Settings Integration**: User preferences tied to profiles
- **Watchlist Integration**: Personal watchlists for each user
- **Statistics Tracking**: Account age, activity, and usage stats

### GitHub Actions
- Fixed release creation permissions
- Automated Windows and macOS builds
- Proper artifact handling and release publishing

## 🎯 Previous Features (Still Available)

### Core Functionality
- Browse movies and TV shows from TMDB
- Personal watchlist management
- Advanced search and filtering
- Content details and streaming integration
- Netflix-inspired beautiful UI

### Desktop Features
- **Ghostery Ad Blocker**: Built-in ad and tracker blocking
- **Multiple Filter Lists**: EasyList, EasyPrivacy, uBlock Origin filters
- **Configurable Blocking**: Ads, trackers, malware protection
- **Real-time Protection**: Automatic filter updates

### Platform Features
- **TMDB Integration**: Rich content metadata
- **Multiple Sources**: Various streaming providers
- **Responsive Design**: Works on all devices
- **Modern UI**: Netflix-inspired interface
- **Fast Performance**: Optimized for speed

## 📋 Installation

### Desktop Application
Download the Windows or macOS version from the [releases page](https://github.com/Zacxxx/streall/releases).

### Web Application
Visit the hosted version or run locally:
```bash
npm install
npm run dev
```

## 🔄 Upgrade Notes

- Existing watchlists will be preserved
- First-time users will see profile creation prompt
- Settings and preferences can be migrated to profiles
- No breaking changes to existing functionality

## �� Bug Fixes

- Fixed navbar title display issues on mobile devices
- Resolved responsive design problems
- Improved modal scrolling and layout
- Fixed GitHub Actions release permissions
- Better error handling for profile operations

## 🚀 Coming Soon

- Avatar upload functionality
- Enhanced user preferences
- Profile import/export features
- Advanced statistics and insights
- Social features (local sharing)

---

**Note**: This is a free, open-source project. All features are available without premium subscriptions or payments. 