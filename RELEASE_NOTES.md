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

## 🐛 Bug Fixes

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