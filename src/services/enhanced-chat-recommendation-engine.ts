import { GoogleGenerativeAI } from "@google/generative-ai";
import { contentProcessingEngine } from './content-processing-engine';
import { ContentItem } from './tmdb-service';
import { errorHandlingService, AIServiceError } from './error-handling-service';

// Enhanced types for sophisticated chat processing
export interface UserPreferences {
  genres: string[];
  excludedGenres: string[];
  preferredDecades: number[];
  contentTypes: ('movie' | 'tv')[];
  minRating: number;
  maxRuntime?: number;
  languages: string[];
  moods: string[];
  themes: string[];
  specificRequests: string[];
}

export interface ChatContext {
  sessionHistory: string[];
  previousRecommendations: string[];
  userPreferences: Partial<UserPreferences>;
  currentMood?: string;
  conversationFlow: 'initial' | 'clarifying' | 'recommending' | 'refining';
  lastInteractionTime: Date;
}

export interface EnhancedChatResponse {
  responseText: string;
  suggestedTitles: string[];
  confidence: number;
  content: ContentItem[];
  clarifyingQuestions?: string[];
  detectedPreferences: Partial<UserPreferences>;
  recommendationReasoning: string;
  conversationFlow: 'initial' | 'clarifying' | 'recommending' | 'refining';
}

export interface PreferenceAnalysis {
  genres: string[];
  excludedGenres: string[];
  moods: string[];
  themes: string[];
  contentTypes: ('movie' | 'tv')[];
  specificRequests: string[];
  temporalPreferences: string[]; // era, decade, year
  culturalPreferences: string[]; // language, country, region
  qualityIndicators: string[]; // critically acclaimed, popular, hidden gem
  viewingContext: string[]; // alone, with friends, date night, family
  confidence: number;
}

export class EnhancedChatRecommendationEngine {
  private genAI: GoogleGenerativeAI | null = null;
  private isInitialized = false;
  private chatContexts: Map<string, ChatContext> = new Map();

  // Sophisticated genre mapping for better understanding
  private genreMapping = {
    // Core genres
    'action': ['action', 'adventure', 'thriller', 'martial arts', 'superhero'],
    'comedy': ['comedy', 'romantic comedy', 'dark comedy', 'satire', 'parody'],
    'drama': ['drama', 'character study', 'family drama', 'social drama', 'period drama'],
    'horror': ['horror', 'psychological horror', 'supernatural', 'slasher', 'gothic'],
    'sci-fi': ['science fiction', 'sci-fi', 'cyberpunk', 'space opera', 'dystopian'],
    'fantasy': ['fantasy', 'urban fantasy', 'epic fantasy', 'magical realism'],
    'romance': ['romance', 'romantic drama', 'love story', 'romantic comedy'],
    'mystery': ['mystery', 'detective', 'crime', 'noir', 'police procedural'],
    'documentary': ['documentary', 'docuseries', 'true crime', 'nature', 'biography'],
    'animation': ['animation', 'anime', 'cartoon', 'stop motion', 'cgi'],
    
    // Mood-based categories
    'feel-good': ['uplifting', 'heartwarming', 'inspiring', 'positive', 'cheerful'],
    'dark': ['dark', 'gritty', 'bleak', 'disturbing', 'intense'],
    'thoughtful': ['philosophical', 'intellectual', 'contemplative', 'profound'],
    'escapist': ['adventure', 'fantasy', 'epic', 'spectacular', 'immersive'],
    'emotional': ['tearjerker', 'moving', 'touching', 'heartbreaking', 'cathartic'],
    
    // Style categories
    'art-house': ['art house', 'arthouse', 'experimental', 'avant-garde', 'indie'],
    'blockbuster': ['blockbuster', 'mainstream', 'big budget', 'spectacular'],
    'international': ['foreign', 'international', 'world cinema', 'subtitled'],
    'classic': ['classic', 'vintage', 'old', 'golden age', 'timeless'],
    'contemporary': ['modern', 'recent', 'current', 'new', 'contemporary']
  };

  // Sophisticated mood analysis patterns
  private moodPatterns = {
    'relaxed': ['chill', 'relax', 'unwind', 'easy', 'light', 'casual'],
    'energetic': ['exciting', 'thrilling', 'intense', 'adrenaline', 'action-packed'],
    'contemplative': ['thoughtful', 'deep', 'philosophical', 'meaningful', 'profound', 'thought-provoking'],
    'nostalgic': ['nostalgic', 'classic', 'vintage', 'old-school', 'retro'],
    'adventurous': ['adventure', 'explore', 'journey', 'epic', 'quest'],
    'romantic': ['romantic', 'love', 'date night', 'intimate', 'passionate'],
    'social': ['friends', 'group', 'party', 'fun', 'entertaining'],
    'introspective': ['alone', 'personal', 'character study', 'internal', 'psychological'],
    'escapist': ['escape', 'fantasy', 'different world', 'immersive', 'transport']
  };

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!apiKey) {
        console.warn("VITE_GEMINI_API_KEY not set. Enhanced chat will use fallback logic.");
        this.isInitialized = false;
        return;
      }

      this.genAI = new GoogleGenerativeAI(apiKey);
      this.isInitialized = true;
      console.log("Enhanced Chat Recommendation Engine initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Enhanced Chat Recommendation Engine:", error);
      this.isInitialized = false;
    }
  }

  // Main method to process user chat requests with enhanced AI analysis and robust error handling
  async processUserRequest(
    message: string, 
    sessionId: string = 'default',
    existingContext?: Partial<ChatContext>
  ): Promise<EnhancedChatResponse> {
    return await errorHandlingService.executeWithRetry(
      async () => {
        // Get or create chat context
        const context = this.getOrCreateContext(sessionId, existingContext);
        
        // Update context with current message
        context.sessionHistory.push(message);
        context.lastInteractionTime = new Date();
        
        // Analyze user preferences from the message
        const preferenceAnalysis = await this.analyzeUserPreferences(message, context);
        
        // Update context with detected preferences
        this.updateContextWithPreferences(context, preferenceAnalysis);
        
        // Determine conversation flow
        const conversationFlow = this.determineConversationFlow(message, context, preferenceAnalysis);
        context.conversationFlow = conversationFlow;
        
        // Generate response based on conversation flow
        let response: EnhancedChatResponse;
        
        if (conversationFlow === 'clarifying') {
          response = await this.generateClarifyingResponse(message, context, preferenceAnalysis);
        } else {
          response = await this.generateRecommendationResponse(message, context, preferenceAnalysis);
        }
        
        // Update context with recommendations
        if (response.suggestedTitles.length > 0) {
          context.previousRecommendations.push(...response.suggestedTitles);
        }
        
        // Store updated context
        this.chatContexts.set(sessionId, context);
        
        return response;
      },
      'processUserRequest',
      {
        operation: 'processUserRequest',
        userMessage: message,
        sessionId,
        retryFunction: () => this.getFallbackResponse(message, sessionId)
      }
    );
  }

  // Sophisticated AI-powered preference analysis with enhanced error handling
  private async analyzeUserPreferences(message: string, context: ChatContext): Promise<PreferenceAnalysis> {
    // Force fallback for testing to avoid API quota issues
    if (!this.isInitialized || true) {
      return this.analyzePreferencesWithRules(message, context);
    }

    try {
      const model = this.genAI!.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.3, // Lower temperature for more consistent analysis
          maxOutputTokens: 600,
        },
      });

      const analysisPrompt = `You are an expert content preference analyzer. Analyze this user message to extract detailed preferences for movie and TV show recommendations.

      USER MESSAGE: "${message}"
      
      CONVERSATION HISTORY: ${context.sessionHistory.slice(-3).join(' | ')}
      
      EXISTING PREFERENCES: ${JSON.stringify(context.userPreferences)}

      Extract and categorize the following preference dimensions:

      1. GENRES: Specific genres mentioned or implied
      2. EXCLUDED GENRES: Genres the user wants to avoid
      3. MOODS: Emotional state or desired feeling (relaxed, energetic, contemplative, etc.)
      4. THEMES: Story themes or subjects (love, revenge, coming-of-age, etc.)
      5. CONTENT TYPES: Movies, TV shows, documentaries, or specific formats
      6. SPECIFIC REQUESTS: Particular titles, actors, directors, or franchises mentioned
      7. TEMPORAL PREFERENCES: Time periods, decades, or eras (90s, classic, recent, etc.)
      8. CULTURAL PREFERENCES: Languages, countries, or cultural contexts
      9. QUALITY INDICATORS: Preferences for critically acclaimed, popular, or hidden gems
      10. VIEWING CONTEXT: Social context (alone, with friends, date night, family)

      Analyze the message for:
      - Direct statements ("I want action movies")
      - Implied preferences ("something to unwind to" = relaxed mood)
      - Contextual clues ("for tonight" might imply shorter content)
      - Emotional indicators ("feeling nostalgic" = nostalgic mood)
      - Negative preferences ("not in the mood for horror")

      Respond in this exact JSON format:
      {
        "genres": ["genre1", "genre2"],
        "excludedGenres": ["avoided1", "avoided2"],
        "moods": ["mood1", "mood2"],
        "themes": ["theme1", "theme2"],
        "contentTypes": ["movie", "tv"],
        "specificRequests": ["specific1", "specific2"],
        "temporalPreferences": ["temporal1", "temporal2"],
        "culturalPreferences": ["cultural1", "cultural2"],
        "qualityIndicators": ["quality1", "quality2"],
        "viewingContext": ["context1", "context2"],
        "confidence": 0.85
      }

      Be thorough but precise. Empty arrays are fine if no preferences are detected in that category.`;

      const result = await model.generateContent(analysisPrompt);
      const response = await result.response;
      const jsonText = response.text();
      
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new AIServiceError('Could not extract JSON from preference analysis response', 'gemini', 'preference-analysis');
      }
      
      const analysis = JSON.parse(jsonMatch?.[0] || '{}');
      
      // Validate and normalize the analysis
      return this.validateAndNormalizeAnalysis(analysis);
      
    } catch (error) {
      console.error("Error in AI preference analysis:", error);
      
      // Convert to appropriate error type and let error handling service manage it
      if (error instanceof AIServiceError) {
        throw error;
      }
      
      // Handle different error types without passing the original error
      if (error instanceof SyntaxError) {
        throw new AIServiceError('Failed to parse preference analysis JSON', 'gemini', 'json-parsing');
      }
      
      // Convert to string for safe handling
      const errorStr = String(error);
      
      // Check for specific error patterns
      if (errorStr.includes('quota') || errorStr.includes('rate limit')) {
        throw new AIServiceError('AI service rate limit exceeded during preference analysis', 'gemini', 'rate-limit');
      } else {
        // For other errors, create a generic error
        throw new AIServiceError('Unknown error during preference analysis', 'gemini', 'unknown');
      }
      
      // Fallback to rule-based analysis for other errors
      console.warn('AI preference analysis failed, using rule-based fallback');
      return this.analyzePreferencesWithRules(message, context);
    }
  }

  // Rule-based preference analysis as fallback
  private analyzePreferencesWithRules(message: string, _context: ChatContext): PreferenceAnalysis {
    const lowerMessage = message.toLowerCase();
    const analysis: PreferenceAnalysis = {
      genres: [],
      excludedGenres: [],
      moods: [],
      themes: [],
      contentTypes: [],
      specificRequests: [],
      temporalPreferences: [],
      culturalPreferences: [],
      qualityIndicators: [],
      viewingContext: [],
      confidence: 0.6
    };

    // Genre detection
    for (const [category, keywords] of Object.entries(this.genreMapping)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        analysis.genres.push(category);
      }
    }
    
    // Additional genre normalization for common variations
    if (lowerMessage.includes('science fiction') || lowerMessage.includes('sci fi')) {
      analysis.genres.push('sci-fi');
    }

    // Mood detection
    for (const [mood, keywords] of Object.entries(this.moodPatterns)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        analysis.moods.push(mood);
      }
    }

    // Content type detection
    if (lowerMessage.includes('movie') || lowerMessage.includes('film')) {
      analysis.contentTypes.push('movie');
    }
    if (lowerMessage.includes('tv') || lowerMessage.includes('series') || lowerMessage.includes('show')) {
      analysis.contentTypes.push('tv');
    }

    // Temporal preferences
    if (lowerMessage.includes('classic') || lowerMessage.includes('old')) {
      analysis.temporalPreferences.push('classic');
    }
    if (lowerMessage.includes('recent') || lowerMessage.includes('new') || lowerMessage.includes('modern')) {
      analysis.temporalPreferences.push('contemporary');
    }

    // Cultural preferences
    if (lowerMessage.includes('foreign') || lowerMessage.includes('international') || lowerMessage.includes('subtitled')) {
      analysis.culturalPreferences.push('international');
    }

    // Quality indicators
    if (lowerMessage.includes('critically acclaimed') || lowerMessage.includes('award winning')) {
      analysis.qualityIndicators.push('critically acclaimed');
    }
    if (lowerMessage.includes('popular') || lowerMessage.includes('mainstream')) {
      analysis.qualityIndicators.push('popular');
    }
    if (lowerMessage.includes('hidden gem') || lowerMessage.includes('underrated')) {
      analysis.qualityIndicators.push('hidden gem');
    }

    // Viewing context
    if (lowerMessage.includes('date night') || lowerMessage.includes('romantic evening')) {
      analysis.viewingContext.push('romantic');
    }
    if (lowerMessage.includes('friends') || lowerMessage.includes('group')) {
      analysis.viewingContext.push('social');
    }
    if (lowerMessage.includes('alone') || lowerMessage.includes('by myself')) {
      analysis.viewingContext.push('solo');
    }

    return analysis;
  }

  // Generate sophisticated AI recommendations based on analysis
  private async generateRecommendationResponse(
    message: string, 
    context: ChatContext, 
    analysis: PreferenceAnalysis
  ): Promise<EnhancedChatResponse> {
    // Force fallback for testing to avoid API quota issues
    if (!this.isInitialized || true) {
      return this.generateRuleBasedRecommendations(message, context, analysis);
    }

    try {
      const model = this.genAI!.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      });

      const recommendationPrompt = `You are an expert movie and TV curator with deep knowledge of cinema and television. Generate personalized recommendations based on this detailed preference analysis.

      USER MESSAGE: "${message}"
      
      PREFERENCE ANALYSIS:
      - Genres: ${analysis.genres.join(', ') || 'None specified'}
      - Moods: ${analysis.moods.join(', ') || 'None specified'}
      - Themes: ${analysis.themes.join(', ') || 'None specified'}
      - Content Types: ${analysis.contentTypes.join(', ') || 'Both movies and TV'}
      - Temporal: ${analysis.temporalPreferences.join(', ') || 'Any era'}
      - Cultural: ${analysis.culturalPreferences.join(', ') || 'Any culture'}
      - Quality: ${analysis.qualityIndicators.join(', ') || 'Mixed quality levels'}
      - Context: ${analysis.viewingContext.join(', ') || 'General viewing'}
      
      CONVERSATION HISTORY: ${context.sessionHistory.slice(-2).join(' | ')}
      PREVIOUS RECOMMENDATIONS: ${context.previousRecommendations.slice(-6).join(', ') || 'None'}

      RECOMMENDATION STRATEGY:
      1. Balance popular titles with critically acclaimed and hidden gems
      2. Consider multiple preference dimensions simultaneously
      3. Provide diverse options that match different aspects of their request
      4. Include both obvious and sophisticated choices
      5. Avoid repeating previous recommendations unless specifically requested
      6. Consider the viewing context and mood for appropriate selections

      CONTENT SELECTION CRITERIA:
      - 2-3 well-known titles that perfectly match their preferences
      - 2-3 hidden gems or international options for discovery
      - 1-2 contemporary selections to show relevance
      - Mix movies and TV shows appropriately based on their preferences
      - Ensure all titles are real and searchable in TMDB
      - Prioritize quality and thematic coherence over pure popularity

      Respond in this exact JSON format:
      {
        "responseText": "Your engaging, conversational response explaining the recommendations (2-3 paragraphs, enthusiastic but sophisticated tone)",
        "suggestedTitles": ["Title 1", "Title 2", "Title 3", "Title 4", "Title 5", "Title 6"],
        "confidence": 0.85,
        "recommendationReasoning": "Brief explanation of your selection strategy and why these titles match their preferences",
        "conversationFlow": "recommending"
      }

      Make your response feel personal, knowledgeable, and genuinely helpful. Show expertise while remaining accessible.`;

      const result = await model.generateContent(recommendationPrompt);
      const response = await result.response;
      const jsonText = response.text();
      
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn("Could not extract JSON from recommendation response, using fallback");
        return this.generateRuleBasedRecommendations(message, context, analysis);
      }
      
      const aiResponse = JSON.parse(jsonMatch?.[0] || '{}');
      
      // Convert AI suggestions to TMDB content
      console.log('Converting AI suggestions to TMDB content:', aiResponse.suggestedTitles);
      const tmdbContent = await this.convertSuggestionsToTMDB(aiResponse.suggestedTitles);
      console.log('TMDB content conversion result:', tmdbContent);
      
      return {
        responseText: aiResponse.responseText,
        suggestedTitles: aiResponse.suggestedTitles,
        confidence: aiResponse.confidence || 0.8,
        content: tmdbContent,
        detectedPreferences: this.convertAnalysisToPreferences(analysis),
        recommendationReasoning: aiResponse.recommendationReasoning || "Selected based on your preferences",
        conversationFlow: 'recommending'
      };
      
    } catch (error) {
      console.error("Error generating AI recommendations:", error);
      return this.generateRuleBasedRecommendations(message, context, analysis);
    }
  }

  // Generate clarifying questions when preferences are unclear
  private async generateClarifyingResponse(
    _message: string, 
    _context: ChatContext, 
    analysis: PreferenceAnalysis
  ): Promise<EnhancedChatResponse> {
    const clarifyingQuestions: string[] = [];
    
    // Generate questions based on what's missing or unclear
    if (analysis.genres.length === 0) {
      clarifyingQuestions.push("What genres are you in the mood for? (action, comedy, drama, horror, sci-fi, etc.)");
    }
    
    if (analysis.moods.length === 0) {
      clarifyingQuestions.push("How are you feeling tonight? Looking for something relaxing, exciting, or thought-provoking?");
    }
    
    if (analysis.contentTypes.length === 0) {
      clarifyingQuestions.push("Would you prefer movies or TV series, or are you open to both?");
    }
    
    if (analysis.viewingContext.length === 0) {
      clarifyingQuestions.push("Are you watching alone or with others?");
    }

    const responseText = `I'd love to help you find the perfect content! To give you the best recommendations, could you tell me a bit more about what you're looking for?`;

    return {
      responseText,
      suggestedTitles: [],
      confidence: 0.3,
      content: [],
      clarifyingQuestions: clarifyingQuestions.slice(0, 2), // Limit to 2 questions
      detectedPreferences: this.convertAnalysisToPreferences(analysis),
      recommendationReasoning: "Need more information to provide accurate recommendations",
      conversationFlow: 'clarifying'
    };
  }

  // Convert AI suggestions to TMDB content with error handling
  private async convertSuggestionsToTMDB(titles: string[]): Promise<ContentItem[]> {
    try {
      console.log(`Converting ${titles.length} enhanced chat suggestions to TMDB content...`);
      const tmdbContent = await contentProcessingEngine.convertAISuggestionsToTMDB(titles);
      
      if (tmdbContent.length === 0) {
        console.warn('No TMDB content found for enhanced chat suggestions, using fallback');
        return await this.getFallbackTMDBContent(titles);
      }
      
      console.log(`Successfully converted ${tmdbContent.length}/${titles.length} enhanced chat suggestions to TMDB content`);
      return tmdbContent;
      
    } catch (error) {
      console.error('Error converting enhanced chat suggestions to TMDB:', error);
      return await this.getFallbackTMDBContent(titles);
    }
  }

  // Helper methods
  private getOrCreateContext(sessionId: string, existingContext?: Partial<ChatContext>): ChatContext {
    if (this.chatContexts.has(sessionId)) {
      const context = this.chatContexts.get(sessionId)!;
      // Update with any existing context provided
      if (existingContext) {
        Object.assign(context, existingContext);
      }
      return context;
    }

    const newContext: ChatContext = {
      sessionHistory: [],
      previousRecommendations: [],
      userPreferences: existingContext?.userPreferences || {},
      currentMood: existingContext?.currentMood,
      conversationFlow: 'initial',
      lastInteractionTime: new Date(),
      ...existingContext
    };

    this.chatContexts.set(sessionId, newContext);
    return newContext;
  }

  private updateContextWithPreferences(context: ChatContext, analysis: PreferenceAnalysis): void {
    // Merge detected preferences with existing ones
    if (analysis.genres.length > 0) {
      context.userPreferences.genres = [...(context.userPreferences.genres || []), ...analysis.genres];
    }
    if (analysis.excludedGenres.length > 0) {
      context.userPreferences.excludedGenres = [...(context.userPreferences.excludedGenres || []), ...analysis.excludedGenres];
    }
    if (analysis.moods.length > 0) {
      context.userPreferences.moods = [...(context.userPreferences.moods || []), ...analysis.moods];
    }
    if (analysis.themes.length > 0) {
      context.userPreferences.themes = [...(context.userPreferences.themes || []), ...analysis.themes];
    }
    if (analysis.contentTypes.length > 0) {
      context.userPreferences.contentTypes = analysis.contentTypes;
    }
    
    // Update current mood
    if (analysis.moods.length > 0) {
      context.currentMood = analysis.moods[0];
    }
  }

  private determineConversationFlow(
    message: string, 
    context: ChatContext, 
    analysis: PreferenceAnalysis
  ): 'initial' | 'clarifying' | 'recommending' | 'refining' {
    // If this is the first interaction
    if (context.sessionHistory.length <= 1) {
      return 'initial';
    }

    // If the analysis has low confidence or missing key preferences
    if (analysis.confidence < 0.5 || 
        (analysis.genres.length === 0 && analysis.moods.length === 0 && analysis.themes.length === 0)) {
      return 'clarifying';
    }

    // If user is asking for refinement of previous recommendations
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('different') || lowerMessage.includes('other') || 
        lowerMessage.includes('more like') || lowerMessage.includes('similar')) {
      return 'refining';
    }

    return 'recommending';
  }

  private validateAndNormalizeAnalysis(analysis: any): PreferenceAnalysis {
    return {
      genres: Array.isArray(analysis.genres) ? this.normalizeGenres(analysis.genres) : [],
      excludedGenres: Array.isArray(analysis.excludedGenres) ? this.normalizeGenres(analysis.excludedGenres) : [],
      moods: Array.isArray(analysis.moods) ? this.normalizeMoods(analysis.moods) : [],
      themes: Array.isArray(analysis.themes) ? analysis.themes : [],
      contentTypes: Array.isArray(analysis.contentTypes) ? analysis.contentTypes : [],
      specificRequests: Array.isArray(analysis.specificRequests) ? analysis.specificRequests : [],
      temporalPreferences: Array.isArray(analysis.temporalPreferences) ? analysis.temporalPreferences : [],
      culturalPreferences: Array.isArray(analysis.culturalPreferences) ? this.normalizeCulturalPreferences(analysis.culturalPreferences) : [],
      qualityIndicators: Array.isArray(analysis.qualityIndicators) ? analysis.qualityIndicators : [],
      viewingContext: Array.isArray(analysis.viewingContext) ? analysis.viewingContext : [],
      confidence: typeof analysis.confidence === 'number' ? analysis.confidence : 0.5
    };
  }

  // Normalize AI-generated genres to match our expected format
  private normalizeGenres(genres: string[]): string[] {
    const normalized: string[] = [];
    for (const genre of genres) {
      const lowerGenre = genre.toLowerCase();
      if (lowerGenre === 'science fiction' || lowerGenre === 'sci fi') {
        normalized.push('sci-fi');
      } else if (lowerGenre === 'romantic comedy' || lowerGenre === 'rom com') {
        normalized.push('comedy');
      } else {
        // Find matching category in our genre mapping
        let found = false;
        for (const [category, keywords] of Object.entries(this.genreMapping)) {
          if (keywords.some(keyword => lowerGenre.includes(keyword.toLowerCase()))) {
            normalized.push(category);
            found = true;
            break;
          }
        }
        if (!found) {
          normalized.push(lowerGenre);
        }
      }
    }
    return [...new Set(normalized)]; // Remove duplicates
  }

  // Normalize AI-generated moods to match our expected format
  private normalizeMoods(moods: string[]): string[] {
    const normalized: string[] = [];
    for (const mood of moods) {
      const lowerMood = mood.toLowerCase();
      // Find matching mood in our mood patterns
      let found = false;
      for (const [category, keywords] of Object.entries(this.moodPatterns)) {
        if (keywords.some(keyword => lowerMood.includes(keyword.toLowerCase()))) {
          normalized.push(category);
          found = true;
          break;
        }
      }
      if (!found) {
        normalized.push(lowerMood);
      }
    }
    return [...new Set(normalized)]; // Remove duplicates
  }

  // Normalize cultural preferences
  private normalizeCulturalPreferences(cultural: string[]): string[] {
    const normalized: string[] = [];
    for (const pref of cultural) {
      const lowerPref = pref.toLowerCase();
      if (lowerPref.includes('foreign') || lowerPref.includes('international') || 
          lowerPref.includes('world cinema') || lowerPref.includes('subtitled')) {
        normalized.push('international');
      } else {
        normalized.push(lowerPref);
      }
    }
    return [...new Set(normalized)]; // Remove duplicates
  }

  private convertAnalysisToPreferences(analysis: PreferenceAnalysis): Partial<UserPreferences> {
    return {
      genres: analysis.genres,
      excludedGenres: analysis.excludedGenres,
      contentTypes: analysis.contentTypes,
      moods: analysis.moods,
      themes: analysis.themes,
      specificRequests: analysis.specificRequests,
      languages: analysis.culturalPreferences
    };
  }

  // Fallback methods
  private async generateRuleBasedRecommendations(
    message: string, 
    _context: ChatContext, 
    analysis: PreferenceAnalysis
  ): Promise<EnhancedChatResponse> {
    // Implementation of rule-based recommendations as fallback
    const lowerMessage = message.toLowerCase();
    let responseText = "";
    let suggestedTitles: string[] = [];

    // Generate response based on detected preferences
    if (analysis.genres.includes('action')) {
      responseText = "I can see you're in the mood for some high-octane action! I've selected films that showcase exceptional choreography, practical effects, and compelling characters. These aren't just mindless spectacle—they're masterfully crafted action experiences.";
      suggestedTitles = ["Mad Max: Fury Road", "John Wick", "The Raid", "Baby Driver", "Mission: Impossible - Fallout", "Atomic Blonde"];
    } else if (analysis.genres.includes('horror')) {
      responseText = "For horror enthusiasts, I've curated films that prioritize psychological tension and artistic merit over cheap scares. These selections showcase how horror can be both terrifying and intellectually engaging.";
      suggestedTitles = ["Hereditary", "The Witch", "Get Out", "Midsommar", "The Babadook", "It Follows"];
    } else if (analysis.genres.includes('comedy')) {
      responseText = "Comedy is an art form, and these selections prove it! I've chosen films that blend humor with heart, intelligence, and social commentary. These aren't just funny movies—they're smart, well-crafted stories.";
      suggestedTitles = ["The Grand Budapest Hotel", "Parasite", "Knives Out", "Hunt for the Wilderpeople", "What We Do in the Shadows", "The Nice Guys"];
    } else if (analysis.contentTypes.includes('tv')) {
      responseText = "Television has reached new artistic heights! These series represent the golden age of TV, offering cinematic quality storytelling with the depth that only long-form narrative can provide.";
      suggestedTitles = ["The Sopranos", "Breaking Bad", "The Wire", "True Detective", "Fargo", "Better Call Saul"];
    } else if (lowerMessage.includes('different') || lowerMessage.includes('something else') || lowerMessage.includes('other')) {
      responseText = "Looking for something different? I've curated an eclectic mix that spans genres and styles. These selections offer unique perspectives and storytelling approaches that should provide a refreshing change of pace.";
      suggestedTitles = ["Parasite", "Everything Everywhere All at Once", "The Handmaiden", "Burning", "Minari", "Sound of Metal"];
    } else {
      responseText = "Based on your request, I've selected a diverse mix of critically acclaimed content that represents the best of contemporary cinema and television. These selections balance artistic merit with entertainment value.";
      suggestedTitles = ["The Godfather", "Pulp Fiction", "Spirited Away", "Moonlight", "There Will Be Blood", "The Social Network"];
    }

    // Convert suggested titles to TMDB content
    console.log('Converting rule-based suggestions to TMDB content:', suggestedTitles);
    const tmdbContent = await this.convertSuggestionsToTMDB(suggestedTitles);
    console.log('Rule-based TMDB content conversion result:', tmdbContent);

    return {
      responseText,
      suggestedTitles,
      confidence: 0.7,
      content: tmdbContent,
      detectedPreferences: this.convertAnalysisToPreferences(analysis),
      recommendationReasoning: "Generated using rule-based analysis of your preferences",
      conversationFlow: 'recommending'
    };
  }

  private async getFallbackTMDBContent(titles: string[]): Promise<ContentItem[]> {
    try {
      console.log('Attempting fallback TMDB content search for enhanced chat');
      const { tmdbService } = await import('./tmdb-service');
      const contentItems: ContentItem[] = [];
      
      // Try to search for each title individually with simpler queries
      for (const title of titles.slice(0, 4)) { // Limit to 4 to avoid overwhelming
        try {
          const searchResult = await tmdbService.search(title, { type: 'all' }, 1, 1);
          if (searchResult.results && searchResult.results.length > 0) {
            const result = searchResult.results[0];
            if (result) {
              contentItems.push(result);
            }
          }
        } catch (error) {
          console.warn(`Fallback search failed for "${title}":`, error);
        }
      }
      
      console.log(`Fallback TMDB search found ${contentItems.length} items`);
      return contentItems;
    } catch (error) {
      console.error('Complete fallback TMDB content failure:', error);
      return [];
    }
  }

  private getFallbackResponse(_message: string, _sessionId: string): EnhancedChatResponse {
    return {
      responseText: "I apologize, but I'm having trouble processing your request right now. Could you try rephrasing what you're looking for? For example, you could mention a genre, mood, or specific type of content you'd like to watch.",
      suggestedTitles: [],
      confidence: 0.3,
      content: [],
      detectedPreferences: {},
      recommendationReasoning: "Fallback response due to processing error",
      conversationFlow: 'clarifying'
    };
  }

  // Clean up old contexts to prevent memory leaks
  public cleanupOldContexts(): void {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [sessionId, context] of this.chatContexts.entries()) {
      if (now.getTime() - context.lastInteractionTime.getTime() > maxAge) {
        this.chatContexts.delete(sessionId);
      }
    }
  }
}

// Export singleton instance
export const enhancedChatRecommendationEngine = new EnhancedChatRecommendationEngine();
export default enhancedChatRecommendationEngine;