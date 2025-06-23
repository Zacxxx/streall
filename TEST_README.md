# Streall Route Testing Scripts

This directory contains testing scripts for the Streall app, specifically for testing the `/watch/movie/574475` route and extracting stream URLs from iframes.

## Overview

The Streall app uses the following URL generation pattern for movies:
- **Route**: `/watch/movie/{tmdb_id}`
- **Example**: `/watch/movie/574475`
- **Generated Stream URL**: `https://www.2embed.cc/embed/574475`

### 🆕 Provider Update: 2embed.cc

**Updated from multiembed.mov to 2embed.cc** for better reliability:
- **Movies**: `https://www.2embed.cc/embed/{tmdb_id}`
- **TV Episodes**: `https://www.2embed.cc/embedtv/{tmdb_id}&s={season}&e={episode}`
- **TV Seasons**: `https://www.2embed.cc/embedtvfull/{tmdb_id}`

## Test Scripts

### 1. `simple-url-test.js` (Recommended for Quick Testing)

A lightweight script that simulates the URL generation logic without requiring a browser.

#### Features:
- ✅ Simulates the PlayerPage component logic
- ✅ Fetches content details from TMDB API
- ✅ Tests stream URL accessibility
- ✅ Generates alternative stream URLs
- ✅ No dependencies required (uses Node.js built-ins)

#### Usage:
```bash
# Run the simple test
node simple-url-test.js
```

#### Expected Output:
```
🎬 Streall Stream URL Test Suite
=================================

🔧 Generating stream URL...
   • Content ID: 574475
   • Media Type: movie
   • Generated URL: https://multiembed.mov/?video_id=574475&tmdb=1

📋 Route Simulation Results:
   • Route: /watch/movie/574475
   • Generated Stream URL: https://multiembed.mov/?video_id=574475&tmdb=1

🎯 Content Information:
   • Title: [Movie Title]
   • Release Year: [Year]
   • Rating: [Rating]/10
   • Overview: [Description...]
```

### 2. `test-watch-route.cjs` (Full Browser Testing)

A comprehensive script using Puppeteer that actually loads the Streall app in a browser and extracts the iframe URL.

#### Prerequisites:
```bash
# Install Puppeteer
npm install puppeteer
```

#### Features:
- 🌐 Launches real browser instance
- 🎯 Navigates to actual Streall app
- 📊 Extracts iframe details
- 📸 Takes screenshots
- 🔍 Monitors network requests
- 🧹 Comprehensive error handling

#### Usage:
```bash
# First, make sure Streall app is running
npm run dev

# Then run the browser test
node test-watch-route.cjs
```

## How the Streall App Works

Based on the code analysis, here's how the `/watch/movie/574475` route works:

### 1. Route Configuration
```typescript
// From src/App.tsx
<Route path="/watch/:mediaType/:contentId" element={<PlayerPage />} />
```

### 2. PlayerPage Component Logic
```typescript
// From src/App.tsx - PlayerPage function
const { mediaType, contentId } = useParams();

// Fetch content from TMDB
const contentData = await tmdbService.getDetails(parseInt(contentId), 'movie');

// Generate embed URL
const baseUrl = 'https://multiembed.mov';
const url = `${baseUrl}/?video_id=${contentId}&tmdb=1`;
```

### 3. Iframe Implementation
```jsx
<iframe
  src={embedUrl}
  className="w-full h-full"
  frameBorder="0"
  allowFullScreen
  allow="autoplay; encrypted-media; fullscreen"
  title={content.title}
/>
```

## Expected Stream URLs

For movie ID `574475`, the app now generates:

1. **Primary URL**: `https://www.2embed.cc/embed/574475`
2. **Legacy URL**: `https://multiembed.mov/?video_id=574475&tmdb=1` (deprecated)

## Testing Different Content

### Movies
```bash
# Test different movie IDs
node simple-url-test.js
# Modify the contentId in the script or pass as argument
```

### TV Shows
The app also supports TV shows with season/episode parameters:
- **Route**: `/watch/tv/{tmdb_id}?s={season}&e={episode}`
- **Example**: `/watch/tv/574475?s=1&e=1`
- **Generated URL**: `https://multiembed.mov/?video_id=574475&tmdb=1&s=1&e=1`

## Troubleshooting

### Common Issues:

1. **"App not accessible"**
   ```bash
   # Make sure Streall is running
   npm run dev
   # Should be available at http://localhost:5173
   ```

2. **"TMDB API error"**
   - The TMDB API key is included in the script
   - Check internet connection
   - Verify content ID exists

3. **"Stream URL not accessible"**
   - This is normal - streaming sites often block HEAD requests
   - The URL might still work in an iframe context

### Debug Mode:
```bash
# Run with additional logging
DEBUG=true node simple-url-test.js
```

## Script Files

- `simple-url-test.cjs` - Lightweight URL generation and testing
- `test-watch-route.cjs` - Full browser automation testing  
- `test-package.json` - Dependencies for Puppeteer testing
- `TEST_README.md` - This documentation

## Recent Fixes

### ✅ ES Module Issue Fixed
- Renamed scripts from `.js` to `.cjs` to avoid ES module conflicts
- Both test scripts now work properly with the Streall project structure

### ✅ Fullscreen Issue Fixed
- Modified PlayerPage component to not force fullscreen on the container
- The iframe now uses responsive height instead of `h-screen`
- The embedded player can now control its own fullscreen functionality
- Header is no longer absolutely positioned over the player

## Example Test Results

```bash
🎬 Starting Streall Route Test
===============================

🔧 Generating stream URL...
   • Content ID: 574475
   • Media Type: movie
   • Generated URL: https://multiembed.mov/?video_id=574475&tmdb=1

📋 Route Simulation Results:
   • Route: /watch/movie/574475
   • Generated Stream URL: https://multiembed.mov/?video_id=574475&tmdb=1

🎯 Content Information:
   • Title: Glass Onion: A Knives Out Mystery
   • Release Year: 2022
   • Rating: 7.1/10
   • Overview: World-famous detective Benoit Blanc heads to Greece...

🔍 Testing Stream URL:
   • Status Code: 200
✅ Stream URL is accessible

🔧 Alternative Stream URLs:
   • 2embed URL: https://www.2embed.cc/embed/574475
   • Multiembed URL: https://multiembed.mov/?video_id=574475&tmdb=1

✨ Test completed!
```

## Notes

- The actual movie ID `574475` corresponds to "Glass Onion: A Knives Out Mystery" (2022)
- Stream URLs are generated dynamically based on TMDB IDs
- The app fetches content metadata from TMDB API for display
- Multiple streaming sources are supported for redundancy 