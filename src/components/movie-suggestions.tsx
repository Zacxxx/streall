import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Calendar, User, Bot, Loader2, BarChart3, Sparkles, TrendingUp, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Movie } from '@/services/geminiServices';
import { tmdbService, type ContentItem } from '@/services/tmdb-service';
import { aiRecommendationService } from '@/services/ai-recommendation-service';
import { smartContentMapper } from '@/services/smart-content-mapper';
import { errorHandlingService } from '@/services/error-handling-service';
import { performanceOptimizationService } from '@/services/performance-optimization-service';
import { trackUserInteraction, trackPerformance } from '@/services/monitoring-service';
// import NetflixCard from '@/components/netflix-card';
// import LazyNetflixCard from '@/components/lazy-netflix-card';
import BatchContentLoader from '@/components/batch-content-loader';
import { MonitoringDashboard } from '@/components/monitoring-dashboard';

interface DailySelection {
  date: string;
  theme: string;
  curator: string;
  curatorDescription: string;
  curatorReasoning: string;
  curatorBio: string;
  movies: Movie[];
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  suggestions?: ContentItem[];
  timestamp: Date;
  isLoading?: boolean;
}

// Get current date in GMT+1 for consistent global daily reset
const getCurrentDateGMTPlus1 = (): string => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const gmtPlus1 = new Date(utc + (1 * 3600000));
  return gmtPlus1.toISOString().split('T')[0] || gmtPlus1.toISOString().substring(0, 10);
};

// Generate enhanced daily curator using the new AI Recommendation Service with robust error handling
const generateDailySelection = async (): Promise<DailySelection> => {
  try {
    console.log('Generating daily selection using Enhanced AI Service...');
    
    // Use the new AI Recommendation Service with error handling
    const curatorResponse = await aiRecommendationService.generateDailyCurator();
    console.log('Enhanced AI curator response:', curatorResponse);
    
    // Convert the new service response to the expected format
    const movies: Movie[] = curatorResponse.suggestedTitles.map((title, i) => ({
      title,
      year: 2000 + i, // Simple year assignment
      director: "Various",
      synopsis: `A critically acclaimed ${curatorResponse.theme.toLowerCase()} selection.`,
      posterUrl: `https://picsum.photos/seed/${title.toLowerCase().replace(/\s+/g, '')}/300/450`
    }));
    
    return {
      date: getCurrentDateGMTPlus1(),
      theme: curatorResponse.theme,
      curator: curatorResponse.curator.name,
      curatorDescription: curatorResponse.curator.description,
      curatorReasoning: curatorResponse.reasoning,
      curatorBio: curatorResponse.curator.bio,
      movies
    };
  } catch (error) {
    console.error('Error generating daily selection:', error);
    
    // Use error handling service to get user-friendly message
    const userMessage = errorHandlingService.getUserFriendlyMessage(error as Error);
    console.warn('Daily selection error message for user:', userMessage);
    
    // Sophisticated fallback with error context
    return {
      date: getCurrentDateGMTPlus1(),
      theme: "Cinematic Masterpieces",
      curator: "Akira Kurosawa",
      curatorDescription: "Legendary Japanese filmmaker and visual storytelling master.",
      curatorReasoning: "Today calls for films that demonstrate the pure poetry of cinema through movement and composition.",
      curatorBio: "Widely regarded as one of the greatest filmmakers in cinema history, Kurosawa revolutionized visual storytelling with his dynamic camera work and profound understanding of human nature. His influence extends across cultures and generations.",
      movies: [
        { title: "Seven Samurai", year: 1954, director: "Akira Kurosawa", synopsis: "Epic tale of honor and sacrifice in feudal Japan.", posterUrl: "https://picsum.photos/seed/sevensamurai/300/450" },
        { title: "8½", year: 1963, director: "Federico Fellini", synopsis: "A director's creative crisis becomes a meditation on art and life.", posterUrl: "https://picsum.photos/seed/eighthalf/300/450" },
        { title: "Persona", year: 1966, director: "Ingmar Bergman", synopsis: "Psychological masterpiece exploring identity and consciousness.", posterUrl: "https://picsum.photos/seed/persona/300/450" },
        { title: "Tokyo Story", year: 1953, director: "Yasujirō Ozu", synopsis: "Contemplative family drama of universal resonance.", posterUrl: "https://picsum.photos/seed/tokyostory/300/450" },
        { title: "Vertigo", year: 1958, director: "Alfred Hitchcock", synopsis: "Hitchcock's psychological thriller about obsession and identity.", posterUrl: "https://picsum.photos/seed/vertigo/300/450" },
        { title: "Mulholland Drive", year: 2001, director: "David Lynch", synopsis: "Lynch's dreamlike exploration of Hollywood and identity.", posterUrl: "https://picsum.photos/seed/mulhollanddrive/300/450" }
      ]
    };
  }
};

// Convert AI movie suggestions to TMDB ContentItems - EXACT same workflow as search
// const searchAndConvertMovies = async (movies: Movie[]): Promise<ContentItem[]> => {
//   console.log('Converting movies to content items using TMDB search:', movies);
//   const contentItems: ContentItem[] = [];
//   
//   for (const movie of movies) {
//     try {
//       console.log(`Searching TMDB for: ${movie.title}`);
//       // Use the exact same search method as search page
//       const searchResult = await tmdbService.search(movie.title, { type: 'movie' }, 1, 1);
//       console.log(`TMDB search result for ${movie.title}:`, searchResult);
//       
//       if (searchResult.results && searchResult.results.length > 0) {
//         const tmdbMovie = searchResult.results[0];
//         if (tmdbMovie) {
//           console.log('Adding TMDB movie:', tmdbMovie);
//           contentItems.push(tmdbMovie);
//         }
//       }
//     } catch (error) {
//       console.error(`Error searching TMDB for ${movie.title}:`, error);
//     }
//   }
//   
//   console.log('Final TMDB content items:', contentItems);
//   return contentItems;
// };



// Fallback content generation for chat when AI processing fails
const getFallbackChatContent = async (userMessage: string): Promise<ContentItem[]> => {
  try {
    const lowerMessage = userMessage.toLowerCase();
    let movieTitles: string[] = [];
    
    if (lowerMessage.includes('sci-fi') || lowerMessage.includes('science fiction')) {
      movieTitles = ["Blade Runner 2049", "Arrival", "Ex Machina", "Interstellar"];
    } else if (lowerMessage.includes('horror')) {
      movieTitles = ["Hereditary", "The Witch", "Get Out", "Midsommar"];
    } else if (lowerMessage.includes('comedy')) {
      movieTitles = ["Parasite", "The Grand Budapest Hotel", "Knives Out", "Jojo Rabbit"];
    } else if (lowerMessage.includes('action')) {
      movieTitles = ["Mad Max: Fury Road", "John Wick", "The Raid", "Baby Driver"];
    } else if (lowerMessage.includes('tv') || lowerMessage.includes('series') || lowerMessage.includes('show')) {
      movieTitles = ["Breaking Bad", "The Sopranos", "The Wire", "True Detective"];
    } else {
      movieTitles = ["The Godfather", "Pulp Fiction", "Goodfellas", "The Shawshank Redemption"];
    }

    const contentItems: ContentItem[] = [];
    
    for (const title of movieTitles) {
      try {
        const searchResult = await tmdbService.search(title, { type: 'all' }, 1, 1);
        if (searchResult.results && searchResult.results.length > 0) {
          const result = searchResult.results[0];
          if (result) {
            contentItems.push(result);
          }
        }
      } catch (error) {
        console.error(`Error searching TMDB for fallback title ${title}:`, error);
      }
    }

    console.log('Fallback content items generated:', contentItems);
    return contentItems;
  } catch (error) {
    console.error('Error generating fallback chat content:', error);
    return [];
  }
};

export function MovieSuggestions() {
  const navigate = useNavigate();
  const [dailySelection, setDailySelection] = useState<DailySelection | null>(null);
  const [dailyContent, setDailyContent] = useState<ContentItem[]>([]);
  const [isLoadingDaily, setIsLoadingDaily] = useState(true);
  
  // Chat states
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Monitoring dashboard state
  const [showMonitoringDashboard, setShowMonitoringDashboard] = useState(false);
  
  // Performance tracking
  const pageLoadStartTime = useRef(Date.now());

  // Load or generate daily selection with enhanced performance tracking
  useEffect(() => {
    const loadDailySelection = async () => {
      const startTime = Date.now();
      setIsLoadingDaily(true);
      
      try {
        const today = getCurrentDateGMTPlus1();
        const cacheKey = `movieSuggestions_${today}`;
        const cached = localStorage.getItem(cacheKey);
        
        let selection: DailySelection;
        
        if (cached) {
          console.log('Loading cached daily selection');
          selection = JSON.parse(cached);
          
          // Track cache hit performance
          trackPerformance('loadDailySelection', startTime, true, {
            source: 'cache',
            curator: selection.curator,
            theme: selection.theme
          });
        } else {
          console.log('Generating new daily selection');
          // Clear any old cache entries for cleanup
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('movieSuggestions_') && key !== cacheKey) {
              localStorage.removeItem(key);
            }
          });
          
          selection = await generateDailySelection();
          localStorage.setItem(cacheKey, JSON.stringify(selection));
          
          // Track generation performance
          trackPerformance('loadDailySelection', startTime, true, {
            source: 'generated',
            curator: selection.curator,
            theme: selection.theme,
            suggestedTitles: selection.movies.length
          });
        }
        
        setDailySelection(selection);
        
        // Track daily curator view with enhanced metadata
        trackUserInteraction('daily_curator_view', 'daily', undefined, undefined, {
          curator: selection.curator,
          theme: selection.theme,
          cached: !!cached,
          loadTime: Date.now() - startTime
        });
        
        // Convert movies to TMDB ContentItems using optimized processing
        console.log('Converting daily movies to TMDB content items with optimization');
        const contentStartTime = Date.now();
        
        // Use performance optimization service for better content loading
        const optimizedContent = await performanceOptimizationService.optimizedContentSearch(
          selection.movies.map(movie => movie.title)
        );
        
        setDailyContent(optimizedContent);
        
        // Track content conversion performance
        trackPerformance('dailyContentConversion', contentStartTime, true, {
          originalCount: selection.movies.length,
          convertedCount: optimizedContent.length,
          conversionRate: (optimizedContent.length / selection.movies.length) * 100
        });
        
      } catch (error) {
        console.error('Error loading daily selection:', error);
        
        // Track error performance
        trackPerformance('loadDailySelection', startTime, false, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        // Use error handling service for user-friendly error display
        const userMessage = errorHandlingService.getUserFriendlyMessage(error as Error);
        console.warn('Daily selection error message for user:', userMessage);
        
      } finally {
        setIsLoadingDaily(false);
      }
    };

    loadDailySelection();
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize chat with welcome message and track page load performance
  useEffect(() => {
    setMessages([{
      id: '1',
      type: 'ai',
      content: "Hello! I'm your personal movie and TV curator powered by advanced AI. Tell me what you're in the mood for, and I'll recommend some amazing content tailored to your taste. What genre, mood, or specific preferences do you have today?",
      timestamp: new Date()
    }]);
    
    // Track page load performance
    trackPerformance('pageLoad', pageLoadStartTime.current, true, {
      component: 'MovieSuggestions',
      loadTime: Date.now() - pageLoadStartTime.current
    });
  }, []);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;

    const startTime = Date.now();
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    const loadingMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: 'ai',
      content: "I'm analyzing your request and curating personalized recommendations...",
      timestamp: new Date(),
      isLoading: true
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInputMessage('');
    setIsProcessing(true);

    // Track chat message interaction with enhanced metadata
    trackUserInteraction('chat_message', 'chat', undefined, undefined, {
      messageLength: userMessage.content.length,
      timestamp: userMessage.timestamp,
      messageNumber: messages.length + 1
    });

    try {
      console.log('Processing user message with enhanced AI service:', userMessage.content);
      
      // Use the Enhanced AI Recommendation Service with performance tracking
      const chatResponse = await aiRecommendationService.processUserRequest(userMessage.content);
      console.log('Enhanced AI chat response:', chatResponse);

      // Get TMDB content from the enhanced response (already processed and optimized)
      const suggestions = chatResponse.content || [];
      console.log('TMDB suggestions from enhanced service:', suggestions);

      // Track successful chat processing performance
      trackPerformance('chatMessageProcessing', startTime, true, {
        messageLength: userMessage.content.length,
        responseLength: chatResponse.responseText.length,
        suggestionsCount: suggestions.length,
        confidence: chatResponse.confidence
      });

      // If no content was returned, try optimized fallback processing
      if (suggestions.length === 0) {
        console.warn('No TMDB content returned from enhanced service, attempting optimized fallback');
        
        const fallbackStartTime = Date.now();
        const fallbackSuggestions = await getFallbackChatContent(userMessage.content);
        
        // Track fallback performance
        trackPerformance('chatFallbackProcessing', fallbackStartTime, fallbackSuggestions.length > 0, {
          fallbackCount: fallbackSuggestions.length,
          originalMessage: userMessage.content.substring(0, 50)
        });
        
        // Update the loading message with response and fallback content
        setMessages(prev => prev.map(msg => 
          msg.id === loadingMessage.id 
            ? { 
                ...msg, 
                content: fallbackSuggestions.length > 0 
                  ? `${chatResponse.responseText}\n\n*Note: Some content searches encountered issues, showing alternative recommendations.*`
                  : `${chatResponse.responseText}\n\n*I'm having trouble finding specific content right now. Please try rephrasing your request or being more specific about what you're looking for.*`,
                suggestions: fallbackSuggestions, 
                isLoading: false 
              }
            : msg
        ));
      } else {
        // Update the loading message with the successful response
        setMessages(prev => prev.map(msg => 
          msg.id === loadingMessage.id 
            ? { ...msg, content: chatResponse.responseText, suggestions, isLoading: false }
            : msg
        ));
      }

    } catch (error) {
      console.error('Error processing message:', error);
      
      // Track error performance
      trackPerformance('chatMessageProcessing', startTime, false, {
        error: error instanceof Error ? error.message : 'Unknown error',
        messageLength: userMessage.content.length
      });
      
      // Use error handling service to get user-friendly message with enhanced context
      const userFriendlyMessage = errorHandlingService.getUserFriendlyMessage(error as Error);
      console.log('User-friendly error message:', userFriendlyMessage);
      
      // Provide contextual error message with specific guidance
      let errorMessage = userFriendlyMessage;
      
      // Add specific guidance based on error type for better user experience
      if (error instanceof Error) {
        if (error.message.includes('TMDB') || error.name === 'TMDBServiceError') {
          errorMessage += " Content search is temporarily unavailable. Please try again in a moment.";
        } else if (error.message.includes('AI') || error.name === 'AIServiceError') {
          errorMessage += " Please try a simpler or more specific request.";
        } else if (error.message.includes('network') || error.name === 'NetworkError') {
          errorMessage += " Please check your connection and try again.";
        } else if (error.message.includes('rate limit')) {
          errorMessage += " Please wait a moment before sending another message.";
        }
      }
      
      // Try to provide optimized fallback content even on error
      try {
        const fallbackStartTime = Date.now();
        const fallbackSuggestions = await getFallbackChatContent(userMessage.content);
        
        // Track fallback attempt performance
        trackPerformance('errorFallbackProcessing', fallbackStartTime, fallbackSuggestions.length > 0, {
          errorType: error instanceof Error ? error.name : 'Unknown',
          fallbackCount: fallbackSuggestions.length
        });
        
        setMessages(prev => prev.map(msg => 
          msg.id === loadingMessage.id 
            ? { 
                ...msg, 
                content: fallbackSuggestions.length > 0 
                  ? `${errorMessage}\n\nHere are some general recommendations based on your request:`
                  : errorMessage,
                suggestions: fallbackSuggestions,
                isLoading: false
              }
            : msg
        ));
      } catch (fallbackError) {
        console.error('Fallback content generation also failed:', fallbackError);
        
        // Final fallback with helpful retry suggestions
        const finalMessage = `${errorMessage}\n\nPlease try again with a different request, or refresh the page if the issue persists. You can also try being more specific about genres, moods, or time periods.`;
        
        setMessages(prev => prev.map(msg => 
          msg.id === loadingMessage.id 
            ? { 
                ...msg, 
                content: finalMessage,
                isLoading: false
              }
            : msg
        ));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle play button navigation with enhanced tracking and error handling
  const handlePlay = (contentId: string) => {
    const startTime = Date.now();
    console.log('Playing content with ID:', contentId);
    
    const allContent = [...dailyContent, ...messages.flatMap(m => m.suggestions || [])];
    
    // Find content by TMDB ID (contentId should be TMDB ID from NetflixCard)
    const item = allContent.find(item => item.tmdb_id.toString() === contentId);
    
    // Enhanced tracking with more detailed metadata
    if (item) {
      const source = dailyContent.some(c => c.tmdb_id.toString() === contentId) ? 'daily' : 'chat';
      trackUserInteraction('play_button', source, contentId, item.type, {
        title: item.title,
        contentType: item.type,
        rating: item.rating,
        genres: item.genres,
        year: item.year,
        navigationTime: Date.now() - startTime
      });
      
      // Track successful content play initiation
      trackPerformance('contentPlayNavigation', startTime, true, {
        source,
        contentType: item.type,
        title: item.title
      });
    }
    
    console.log('Found item for streaming:', item);
    
    if (item) {
      try {
        // Use smart content mapper for consistent streaming URL generation
        const streamingUrl = smartContentMapper.tmdbToStreamingUrl(item);
        console.log('Generated streaming URL:', streamingUrl);
        
        // Use TMDB ID consistently for streaming navigation (matches other components)
        console.log('Using TMDB ID for streaming:', item.tmdb_id, 'for type:', item.type);
        
        // Navigate to the watch page with the correct content type and ID
        // Use the same routing pattern as other components in the application
        const contentType = item.type;
        navigate(`/watch/${contentType}/${item.tmdb_id}`);
        
      } catch (error) {
        console.error('Error generating streaming URL:', error);
        
        // Track navigation error
        trackPerformance('contentPlayNavigation', startTime, false, {
          error: error instanceof Error ? error.message : 'Unknown error',
          contentId,
          contentType: item.type
        });
        
        // Fallback to direct navigation
        const contentType = item.type;
        navigate(`/watch/${contentType}/${item.tmdb_id}`);
      }
    } else {
      console.error('Content not found for TMDB ID:', contentId);
      
      // Enhanced fallback with better error tracking
      trackPerformance('contentPlayNavigation', startTime, false, {
        error: 'Content not found',
        contentId,
        fallbackAttempted: true
      });
      
      // Fallback: try to parse the ID and navigate anyway with improved logic
      const numericId = parseInt(contentId);
      if (!isNaN(numericId)) {
        console.log('Attempting enhanced fallback navigation with parsed TMDB ID:', numericId);
        
        // Try to determine content type from the ID context with better heuristics
        const isFromDaily = dailyContent.some(c => c.tmdb_id.toString() === contentId);
        
        // Check if any message suggestions match this ID
        const matchingMessage = messages.find(m => 
          m.suggestions?.some(s => s.tmdb_id.toString() === contentId)
        );
        
        // If found in message suggestions, check if it's a TV show
        const matchingContent = matchingMessage?.suggestions?.find(
          s => s.tmdb_id.toString() === contentId
        );
        
        // Determine content type with enhanced fallback logic
        let contentType = 'movie'; // default
        if (matchingContent) {
          contentType = matchingContent.type;
        } else if (isFromDaily) {
          // Daily content is typically movies, but check for TV indicators
          contentType = 'movie';
        }
        
        console.log(`Fallback navigation: ${contentType}/${numericId}`);
        navigate(`/watch/${contentType}/${numericId}`);
        
        // Track successful fallback navigation
        trackUserInteraction('play_button', isFromDaily ? 'daily' : 'chat', contentId, contentType as 'movie' | 'tv', {
          fallbackUsed: true,
          contentType,
          navigationTime: Date.now() - startTime
        });
      } else {
        console.error('Invalid content ID format:', contentId);
        
        // Track complete navigation failure
        trackPerformance('contentPlayNavigation', startTime, false, {
          error: 'Invalid content ID format',
          contentId,
          fallbackFailed: true
        });
      }
    }
  };

  // Convert TMDB ContentItem to NetflixCard format using enhanced smart content mapper
  const convertToCardFormat = (item: ContentItem) => {
    try {
      // Use the smart content mapper for consistent conversion with validation
      const converted = smartContentMapper.tmdbToNetflixCard(item);
      
      // Validate content completeness for better user experience
      const validation = smartContentMapper.validateContentCompleteness(item);
      
      // Log quality warnings for monitoring
      if (validation.warnings.length > 0) {
        console.warn(`Content quality warnings for ${item.title}:`, validation.warnings);
      }
      
      // Ensure all required IDs are properly set for routing consistency
      return {
        ...converted,
        id: item.tmdb_id.toString(), // Always use TMDB ID as primary ID
        tmdb_id: item.tmdb_id, // Ensure TMDB ID is always present for proper routing
        imdb_id: converted.imdb_id, // Keep the normalized IMDB ID from the mapper
        // Add quality metadata for potential UI enhancements
        _qualityScore: validation.qualityScore,
        _completeness: validation.completeness
      };
    } catch (error) {
      console.error('Error converting content to card format:', error);
      
      // Enhanced fallback with better error handling
      try {
        // Attempt to use error handling service for recovery
        const fallbackContent = {
          id: item.tmdb_id.toString(), // Always use TMDB ID as primary ID
          imdb_id: item.imdb_id || `tmdb_${item.tmdb_id}`,
          title: item.title || 'Unknown Title',
          year: item.year,
          rating: item.rating || 0,
          genres: item.genres || [],
          poster: item.poster || undefined,
          backdropPath: item.backdropPath || undefined,
          overview: item.overview || 'No description available.',
          type: item.type,
          runtime: item.runtime,
          tmdb_rating: item.rating || 0,
          seasons: item.seasons || undefined,
          episodes: item.episodes || undefined,
          tmdb_id: item.tmdb_id, // Include TMDB ID for proper routing
          _qualityScore: 50, // Default quality score for fallback
          _completeness: 60 // Default completeness for fallback
        };
        
        console.log('Using fallback content format for:', item.title);
        return fallbackContent;
      } catch (fallbackError) {
        console.error('Fallback content conversion also failed:', fallbackError);
        
        // Minimal fallback to prevent complete failure
        return {
          id: item.tmdb_id?.toString() || 'unknown',
          imdb_id: 'unknown',
          title: item.title || 'Unknown Content',
          overview: 'Content information unavailable.',
          type: item.type || 'movie',
          tmdb_id: item.tmdb_id || 0,
          _qualityScore: 0,
          _completeness: 0
        };
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black text-white pt-20 pb-16">
      <div className="container mx-auto px-4 md:px-8 max-w-7xl">
        
        {/* Enhanced Header with Progressive Loading */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="text-4xl md:text-5xl font-bold text-white mb-4"
              >
                <span className="text-red-500 inline-flex items-center gap-2">
                  <Sparkles className="w-8 h-8 md:w-10 md:h-10" />
                  AI
                </span> Movie Curator
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="text-slate-400 text-lg mb-4"
              >
                Personalized recommendations from our daily curator and interactive AI assistant
              </motion.p>
              
              {/* Enhanced Status Indicators */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-4 text-sm"
              >
                <div className="flex items-center gap-2 text-green-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>AI Services Active</span>
                </div>
                <div className="flex items-center gap-2 text-blue-400">
                  <TrendingUp className="w-4 h-4" />
                  <span>Enhanced Recommendations</span>
                </div>
                <div className="flex items-center gap-2 text-purple-400">
                  <Clock className="w-4 h-4" />
                  <span>Real-time Content</span>
                </div>
              </motion.div>
            </div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
            >
              <Button
                onClick={() => setShowMonitoringDashboard(true)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-slate-800 border-slate-600 hover:bg-slate-700 transition-all duration-200"
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          
          {/* Left Column - Enhanced Daily Curator Selection */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            <div className="bg-gradient-to-br from-red-900/20 via-red-800/10 to-transparent border border-red-500/30 rounded-xl p-6 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-center gap-3 mb-4"
              >
                <Calendar className="w-6 h-6 text-red-500" />
                <h2 className="text-2xl font-bold text-white">Today's Curator</h2>
                {!isLoadingDaily && dailySelection && (
                  <div className="ml-auto flex items-center gap-2 text-xs text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>AI Generated</span>
                  </div>
                )}
              </motion.div>

              {isLoadingDaily ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating today's curator and theme...</span>
                  </div>
                  <div className="h-4 bg-slate-700 rounded animate-pulse" />
                  <div className="h-4 bg-slate-700 rounded animate-pulse w-3/4" />
                  <div className="h-16 bg-slate-700 rounded animate-pulse" />
                </motion.div>
              ) : dailySelection && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-4"
                >
                  <div>
                    <motion.h3 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 }}
                      className="text-xl font-semibold text-red-400 mb-2"
                    >
                      {dailySelection.theme}
                    </motion.h3>
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 }}
                      className="flex items-center gap-3 text-slate-300 mb-3"
                    >
                      <User className="w-5 h-5" />
                      <span className="font-medium text-lg">{dailySelection.curator}</span>
                    </motion.div>
                    <motion.p 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 }}
                      className="text-slate-400 text-sm mb-3"
                    >
                      {dailySelection.curatorDescription}
                    </motion.p>
                  </div>
                  
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50"
                  >
                    <p className="text-slate-300 text-sm italic mb-2">
                      "{dailySelection.curatorReasoning}"
                    </p>
                    <p className="text-slate-400 text-xs">
                      {dailySelection.curatorBio}
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </div>

            {/* Enhanced Daily Movies Grid with Progressive Loading */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Today's Curated Collection</h3>
                {!isLoadingDaily && dailyContent.length > 0 && (
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span>{dailyContent.length} recommendations</span>
                    <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                    <span>TMDB verified</span>
                  </div>
                )}
              </div>
              
              {isLoadingDaily ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading curated content from TMDB...</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="aspect-[3/4] bg-slate-800 rounded-lg animate-pulse flex items-center justify-center"
                      >
                        <div className="text-slate-600 text-xs">Loading...</div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ) : dailyContent.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <BatchContentLoader
                    content={dailyContent.map(content => convertToCardFormat(content))}
                    onPlay={(contentId) => handlePlay(contentId)}
                    size="small"
                    gridCols={3}
                    batchSize={6}
                    loadingDelay={50}
                    enableImagePreloading={true}
                    className="transition-all duration-300"
                  />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="text-center py-8 bg-slate-800/50 rounded-lg border border-slate-700"
                >
                  <p className="text-slate-400 mb-2">No content available for today's selection</p>
                  <p className="text-slate-500 text-sm">Please try refreshing the page</p>
                </motion.div>
              )}
            </motion.div>
          </motion.div>

          {/* Right Column - Enhanced AI Chat Interface */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-slate-900/50 rounded-xl border border-slate-700 flex flex-col h-[600px] backdrop-blur-sm"
          >
            {/* Enhanced Chat Header */}
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="p-4 border-b border-slate-700 bg-gradient-to-r from-blue-900/20 to-purple-900/20"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Bot className="w-6 h-6 text-blue-500" />
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.6, type: "spring" }}
                      className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-slate-900"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">AI Movie Assistant</h3>
                    <p className="text-slate-400 text-xs">Powered by enhanced recommendation engine</p>
                  </div>
                </div>
                
                {/* Chat Status Indicators */}
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1 text-green-400">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                    <span>Online</span>
                  </div>
                  {messages.length > 1 && (
                    <div className="text-slate-400">
                      {messages.filter(m => m.type === 'user').length} messages
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Enhanced Chat Messages with Progressive Loading */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
              <AnimatePresence mode="popLayout">
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 500, 
                      damping: 30,
                      delay: index * 0.05 
                    }}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-xl p-3 shadow-lg ${
                      message.type === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                        : 'bg-gradient-to-r from-slate-800 to-slate-700 text-slate-100 border border-slate-600'
                    }`}>
                      <div className="flex items-start gap-2">
                        {message.type === 'ai' && (
                          <motion.div
                            initial={{ rotate: -10, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                          >
                            <Bot className="w-4 h-4 text-blue-400 flex-shrink-0 mt-1" />
                          </motion.div>
                        )}
                        <div className="flex-1">
                          <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="text-sm leading-relaxed"
                          >
                            {message.isLoading ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span className="animate-pulse">{message.content}</span>
                              </div>
                            ) : (
                              message.content
                            )}
                          </motion.p>
                          
                          {/* Enhanced Movie Suggestions with Progressive Loading */}
                          {message.suggestions && message.suggestions.length > 0 && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 }}
                              className="mt-3 space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-slate-400 font-medium flex items-center gap-2">
                                  <Sparkles className="w-3 h-3" />
                                  RECOMMENDED FOR YOU
                                </p>
                                <span className="text-xs text-slate-500">
                                  {message.suggestions.length} suggestions
                                </span>
                              </div>
                              <BatchContentLoader
                                content={message.suggestions.map(content => convertToCardFormat(content))}
                                onPlay={(contentId) => handlePlay(contentId)}
                                size="small"
                                gridCols={2}
                                batchSize={4}
                                loadingDelay={100}
                                enableImagePreloading={true}
                                className="transition-all duration-300"
                              />
                            </motion.div>
                          )}
                          
                          {/* Message Timestamp */}
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="mt-2 text-xs opacity-50"
                          >
                            {message.timestamp.toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Enhanced Chat Input with Better UX */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="p-4 border-t border-slate-700 bg-gradient-to-r from-slate-900/50 to-slate-800/50"
            >
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                className="flex gap-2"
              >
                <div className="flex-1 relative">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={isProcessing ? "Processing your request..." : "Ask for movie or TV recommendations..."}
                    className="bg-slate-800 border-slate-600 text-white placeholder-slate-400 text-sm pr-12 focus:border-blue-500 transition-colors"
                    disabled={isProcessing}
                    maxLength={500}
                  />
                  {inputMessage.length > 0 && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-slate-500">
                      {inputMessage.length}/500
                    </div>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={isProcessing || !inputMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700 px-4 transition-all duration-200 disabled:opacity-50"
                  size="sm"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
              
              {/* Quick Suggestion Buttons */}
              {!isProcessing && messages.length <= 2 && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="mt-3 flex flex-wrap gap-2"
                >
                  {[
                    "Action movies like John Wick",
                    "Feel-good comedies",
                    "Sci-fi series",
                    "Horror films",
                    "International cinema"
                  ].map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => setInputMessage(suggestion)}
                      className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-full transition-colors duration-200"
                    >
                      {suggestion}
                    </button>
                  ))}
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        </div>
      </div>
      
      {/* Enhanced Monitoring Dashboard */}
      <AnimatePresence>
        {showMonitoringDashboard && (
          <MonitoringDashboard
            isVisible={showMonitoringDashboard}
            onClose={() => setShowMonitoringDashboard(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
} 