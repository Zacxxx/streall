# 🎬 Streall - Frontend TMDB Streaming Platform

A modern **frontend-only** streaming platform powered by **TMDB API** with **SuperEmbed** integration for seamless movie and TV show streaming.

## ✨ Features

- 🎥 **Direct TMDB Integration**: Real-time access to millions of movies and TV shows
- 📺 **SuperEmbed Streaming**: Simple iframe integration via multiembed.mov
- 🔍 **Advanced Search**: Fast, comprehensive search across all content
- 🎭 **Genre Discovery**: Browse content by categories and filters
- 📱 **Responsive Design**: Works perfectly on all devices
- ⚡ **Ultra-Fast**: Pure frontend, no backend server required
- 🌐 **Cloud-Ready**: Deploy to any static hosting platform
- 💰 **Cost-Effective**: No server costs, just frontend hosting

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- TMDB API Key ([Get one here](https://www.themoviedb.org/settings/api))

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd streall
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   # Copy environment template
   cp env.example .env
   
   # Edit .env and add your TMDB API key
   VITE_TMDB_API_KEY=your_actual_tmdb_api_key_here
   ```

4. **Start development**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   - Application: http://localhost:5173

## 🏗️ Architecture

### Simplified Frontend-Only Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **API**: Direct TMDB API calls from browser
- **Streaming**: SuperEmbed integration
- **Hosting**: Any static host (Vercel, Netlify, etc.)
- **No Backend**: Pure client-side application

### SuperEmbed Streaming URLs\n\nThe platform automatically generates streaming URLs using SuperEmbed (multiembed.mov):\n\n- **Movies**: \https://multiembed.mov/?video_id={imdb_id}\\n- **TV Episodes**: \https://multiembed.mov/?video_id={imdb_id}&s={season}&e={episode}\\n- **TMDB fallback**: add \&tmdb=1\ when only a TMDB id is available\n- **VIP mode**: append \useVip=true\ in code to request \directstream.php\ URLs\n\n## 🎯 Key Services

### TMDB Service (`src/services/tmdb-service.ts`)
Direct TMDB API integration with:
- Trending content detection
- Popular content curation
- Advanced search capabilities
- Genre-based discovery
- Detailed content information
- Season and episode management

### Database Service (`src/services/database.ts`)
Abstraction layer providing:
- Backward compatibility with existing components
- Unified API for content access
- Caching and optimization
- Error handling

### Content Service (`src/services/content-service.ts`)
Content management and streaming:
- Stream URL generation
- Content categorization
- User preferences
- Watchlist management

## 🎨 Frontend Components

### Core Components
- **NetflixHero**: Main banner with featured content
- **ContentRows**: Horizontal scrolling content rows
- **UltraSearch**: Advanced search with filters
- **VideoPlayer**: Integrated SuperEmbed player
- **AllContentBrowser**: Paginated content browser

### Backend Components (`src/components/backend/`)
Future backend-like functionality can be organized here:
- API clients
- Data processors
- Cache managers
- Utility functions

## 🔧 Configuration

### Environment Variables

```env
# Required
VITE_TMDB_API_KEY=your_tmdb_api_key

# Optional
NODE_ENV=development
VITE_API_BASE_URL=http://localhost:5173
```

### Deployment Options

**Static Hosting (Recommended):**
- **Vercel** - Perfect for React apps
- **Netlify** - Great for static sites
- **GitHub Pages** - Free hosting
- **Cloudflare Pages** - Fast global CDN

**Traditional Hosting:**
- **Digital Ocean** - App Platform
- **AWS S3** - Static website hosting
- **Google Cloud** - Firebase Hosting
- **Azure** - Static Web Apps

## 📦 Build for Production

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview

# The build output will be in the 'dist' folder
```

## 🎯 Why Frontend-Only Architecture?

### ✅ Advantages
- **Zero Server Costs**: No backend hosting expenses
- **Instant Deployment**: Deploy to any static host in seconds
- **Unlimited Scalability**: CDN handles all traffic
- **Always Up-to-Date**: Real-time TMDB data
- **Fast Development**: No backend setup or maintenance
- **Global Performance**: CDN edge locations worldwide
- **Simple Debugging**: All code runs in browser

### 🔄 Migration Benefits
This architecture eliminates:
- Backend server setup and maintenance
- Database hosting and management
- Server-side dependencies
- Complex deployment pipelines
- Infrastructure monitoring

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript type checking

### Development Tips

1. **API Key Security**: The TMDB API key is included in the build but TMDB allows browser requests
2. **Caching**: The TMDB service includes intelligent caching for better performance
3. **Error Handling**: Graceful fallbacks for API failures
4. **Performance**: Lazy loading and code splitting implemented

## 🌟 Features in Action

### Search & Discovery
- Instant search across millions of titles
- Genre-based filtering with real TMDB data
- Year-based filtering and advanced sorting
- Trending and popular content detection

### Streaming Integration\n- One-click streaming for any content\n- Automatic episode navigation for TV shows\n- Season-wise streaming for binge-watching\n- Responsive video player with SuperEmbed

### Content Management
- Real-time trending content
- Popular content from TMDB
- Similar content recommendations
- Detailed cast and crew information

## 🔒 Security & Best Practices

- **API Key Management**: Environment variables for sensitive data
- **Error Boundaries**: React error boundaries for graceful failures
- **Input Validation**: Client-side validation for all inputs
- **HTTPS Only**: Secure connections for all API calls
- **Content Security**: CSP headers for production builds

## 🚀 Deployment Guide

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variable in Vercel dashboard
VITE_TMDB_API_KEY=your_key
```

### Netlify
```bash
# Build and deploy
npm run build
# Upload dist folder to Netlify
# Set environment variables in Netlify dashboard
```

### Manual Deployment
```bash
# Build the project
npm run build

# Upload 'dist' folder contents to your hosting provider
# Configure environment variables on your host
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly (`npm run build` and `npm run preview`)
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- Check the **Issues** tab for known problems
- Create a **New Issue** for bugs or feature requests
- Review **TMDB API documentation** for API-related questions

---

**🎬 Ready to stream? Get your TMDB API key and deploy in minutes!**

### Quick Deploy Links
- [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)
- [![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy)

