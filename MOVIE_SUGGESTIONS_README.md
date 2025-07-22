# 🎬 AI Movie Curator Feature

The AI Movie Curator is a new feature that provides daily movie suggestions powered by Google's Gemini AI, inspired by the tastes of famous directors, critics, and cultural icons.

## ✨ Features

- **Daily Themed Selections**: Each day features a different theme (Love & Romance, Mind-Bending Sci-Fi, Hidden Gems, etc.)
- **Celebrity Curators**: Suggestions are inspired by the tastes of famous people like Barack Obama, Christopher Nolan, Martin Scorsese, and others
- **5 Movies Per Day**: Each daily selection includes 5 carefully curated movies
- **Smart Integration**: Movies are automatically linked to your existing TMDB database
- **Watchlist Support**: Add any suggested movie to your watchlist
- **Regeneration**: Generate new selections anytime with the refresh button

## 🚀 Setup

1. **Get a Gemini API Key**:
   - Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Create a new API key
   - Copy the key

2. **Set Environment Variable**:
   ```bash
   # In your .env file
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Access the Feature**:
   - Navigate to `/suggestions` in your app
   - Or click "AI Curator" in the header navigation

## 🎯 How It Works

1. **Daily Theme Selection**: Each day, the system randomly selects a theme from 10 predefined options
2. **AI Generation**: Gemini AI generates 5 unique movie suggestions based on the theme and "curator"
3. **TMDB Integration**: When you click a movie, it searches your TMDB database for the actual film
4. **Seamless Navigation**: If found, you're redirected to the standard movie details page
5. **Caching**: Daily selections are cached to avoid regenerating the same content

## 📋 Available Themes & Curators

- **Love & Romance** - Barack Obama
- **Mind-Bending Sci-Fi** - Christopher Nolan
- **Hidden Gems** - Quentin Tarantino
- **International Cinema** - Martin Scorsese
- **Underrated Thrillers** - Ari Aster
- **Coming of Age** - Greta Gerwig
- **Dark Comedy** - Jordan Peele
- **Historical Dramas** - Ken Burns
- **Animated Masterpieces** - Hayao Miyazaki
- **Neo-Noir** - Denis Villeneuve

## 🔧 Technical Implementation

### Components
- `MovieSuggestions` - Main page component
- `geminiServices` - AI integration service

### Key Features
- Local storage caching for daily selections
- TMDB search integration for movie linking
- Responsive design with hover effects
- Error handling for API failures
- Loading states and user feedback

### API Integration
```typescript
// Generate movie suggestions
const movie = await generateMovieSuggestion(prompt);

// Search in TMDB
const results = await tmdbService.search(`${movie.title} ${movie.year}`);

// Navigate to details
navigate(`/details/${tmdbMovie.type}/${tmdbMovie.tmdb_id}`);
```

## 🎨 UI/UX Features

- **Smooth Animations**: Framer Motion animations for engaging interactions
- **Responsive Grid**: Adapts to different screen sizes
- **Hover Effects**: Interactive cards with play/add actions
- **Theme Display**: Shows current theme and curator information
- **Loading States**: Elegant loading animations
- **Error Handling**: User-friendly error messages

## 🔄 Daily Refresh Logic

The system automatically:
1. Checks for existing daily selection in localStorage
2. If none exists, generates a new selection
3. Caches the selection for 24 hours
4. Allows manual refresh with the "New Selection" button

## 📱 Mobile Optimized

- Responsive card layout
- Touch-friendly interactions
- Optimized for mobile viewing
- Swipe-friendly design

## 🚨 Error Handling

- Graceful degradation when API is unavailable
- User-friendly error messages
- Retry functionality
- Fallback for movies not found in TMDB

## 🎥 Integration with Existing System

The feature seamlessly integrates with your existing streaming platform:
- Uses existing TMDB service
- Integrates with watchlist system
- Follows existing routing patterns
- Maintains design consistency

This feature enhances your streaming platform by providing AI-powered movie discovery, making it easier for users to find exceptional films they might not have discovered otherwise. 