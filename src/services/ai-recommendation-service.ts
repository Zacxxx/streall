import { GoogleGenerativeAI } from "@google/generative-ai";
import { contentProcessingEngine, ContentProcessingError, TMDBServiceError } from './content-processing-engine';
import { ContentItem, tmdbService } from './tmdb-service';
import { enhancedChatRecommendationEngine, type EnhancedChatResponse } from './enhanced-chat-recommendation-engine';
import { errorHandlingService, AIServiceError, SuggestionsError } from './error-handling-service';
import { performanceOptimizationService } from './performance-optimization-service';
import { trackPerformance, trackError, monitoringService } from './monitoring-service';

// Types for the AI Recommendation Service
export interface CuratorPersona {
  name: string;
  bio: string;
  expertise: string[];
  description: string;
  avatar?: string;
}

export interface DailyCuratorResponse {
  curator: CuratorPersona;
  theme: string;
  reasoning: string;
  suggestedTitles: string[];
  content?: ContentItem[]; // Real TMDB content items
}

export interface ChatRecommendationResponse {
  responseText: string;
  suggestedTitles: string[];
  confidence: number;
  content?: ContentItem[]; // Real TMDB content items
}

export interface RecommendationContext {
  userPreferences?: {
    genres: string[];
    excludedGenres: string[];
    preferredDecades: number[];
    contentTypes: ('movie' | 'tv')[];
    minRating: number;
    maxRuntime?: number;
  };
  sessionHistory: string[];
  previousRecommendations: string[];
  currentMood?: string;
  specificRequests?: string[];
}

// Legacy error classes - now using enhanced error handling service
export class DailySelectionError extends SuggestionsError {
  constructor(message: string, public cause?: Error, recoverable: boolean = true) {
    super(message, 'DAILY_SELECTION_ERROR', recoverable, 'Unable to generate daily selection. Showing fallback content.', true, cause);
    this.name = 'DailySelectionError';
  }
}

export class AIRecommendationService {
  private genAI: GoogleGenerativeAI | null = null;
  private apiKey: string | null = null;
  private isInitialized = false;

  // Enhanced predefined curator profiles for sophisticated fallback
  private fallbackCurators: CuratorPersona[] = [
    {
      name: "Martin Scorsese",
      bio: "Legendary filmmaker and cinema historian known for his meticulous attention to detail and deep understanding of film history. Master of crime dramas and character studies who has preserved and championed cinema for over five decades.",
      expertise: ["Crime Drama", "Character Studies", "Film History", "Neo-Noir", "Film Preservation"],
      description: "Legendary filmmaker and cinema preservation advocate"
    },
    {
      name: "Akira Kurosawa", 
      bio: "Widely regarded as one of the greatest filmmakers in cinema history, revolutionized visual storytelling with dynamic camera work and profound understanding of human nature. His influence extends across cultures and generations of filmmakers.",
      expertise: ["Visual Storytelling", "Epic Cinema", "Samurai Films", "International Cinema", "Weather as Character"],
      description: "Master of visual poetry and epic storytelling"
    },
    {
      name: "Agnès Varda",
      bio: "Pioneer of the French New Wave and documentary filmmaking, known for her poetic approach to cinema and exploration of social themes through intimate storytelling. The 'grandmother of the New Wave' who remained innovative until her final films.",
      expertise: ["French New Wave", "Documentary", "Social Commentary", "Art House", "Feminist Cinema"],
      description: "Pioneer of poetic documentary and New Wave cinema"
    },
    {
      name: "Christopher Nolan",
      bio: "Contemporary master of complex narratives and practical effects, known for mind-bending thrillers that challenge audiences while delivering spectacular entertainment. Champion of film projection and immersive cinema experiences.",
      expertise: ["Sci-Fi Thrillers", "Complex Narratives", "Mind-Bending Plots", "IMAX Cinema", "Practical Effects"],
      description: "Master of complex narratives and immersive cinema"
    },
    {
      name: "Greta Gerwig",
      bio: "Acclaimed writer-director known for her authentic portrayals of coming-of-age stories and complex female characters, bringing fresh perspectives to contemporary cinema. Former actress turned visionary filmmaker with a keen eye for emotional truth.",
      expertise: ["Coming-of-Age", "Character Development", "Contemporary Drama", "Female Perspectives", "Literary Adaptations"],
      description: "Master of authentic coming-of-age and female-centered storytelling"
    },
    {
      name: "Wong Kar-wai",
      bio: "Hong Kong auteur renowned for his poetic visual style and exploration of love, longing, and urban alienation. Master of mood and atmosphere who creates deeply emotional experiences through color, music, and movement.",
      expertise: ["Romantic Drama", "Visual Poetry", "Urban Stories", "Asian Cinema", "Mood and Atmosphere"],
      description: "Poetic master of romantic melancholy and visual storytelling"
    },
    {
      name: "Ari Aster",
      bio: "Contemporary horror auteur who elevated the genre through meticulous craftsmanship and psychological depth. Known for creating deeply unsettling experiences that linger long after viewing, blending art house sensibilities with genre filmmaking.",
      expertise: ["Psychological Horror", "Art House Horror", "Family Trauma", "Visual Composition", "Atmospheric Tension"],
      description: "Master of elevated psychological horror and family trauma"
    },
    {
      name: "Céline Sciamma",
      bio: "French filmmaker celebrated for her intimate portrayals of female relationships and coming-of-age stories. Master of subtle emotional storytelling who creates profound connections through minimal dialogue and powerful visual language.",
      expertise: ["LGBTQ+ Cinema", "Female Relationships", "Coming-of-Age", "French Cinema", "Intimate Storytelling"],
      description: "Master of intimate female-centered storytelling and LGBTQ+ cinema"
    },
    {
      name: "Jordan Peele",
      bio: "Visionary filmmaker who revolutionized horror through social commentary and genre innovation. Former comedian turned acclaimed director who uses horror as a lens to examine race, class, and American society with both intelligence and entertainment value.",
      expertise: ["Social Horror", "Genre Innovation", "Racial Commentary", "Psychological Thrillers", "Cultural Criticism"],
      description: "Visionary of socially conscious horror and genre innovation"
    },
    {
      name: "Chloé Zhao",
      bio: "Academy Award-winning director known for her naturalistic approach to storytelling and deep empathy for marginalized communities. Master of blending documentary realism with narrative fiction, creating authentic portraits of American life.",
      expertise: ["Naturalistic Drama", "American Stories", "Documentary Style", "Character Studies", "Social Realism"],
      description: "Master of naturalistic storytelling and authentic American portraits"
    }
  ];

  // Enhanced predefined themes with sophisticated reasoning
  private fallbackThemes = [
    {
      name: "Neo-Noir Masterpieces",
      description: "Dark, stylish films that explore the shadows of human nature through urban landscapes and moral ambiguity",
      reasoning: "In our complex modern world, these films offer a mirror to examine the gray areas of morality and the price of ambition. Perfect for contemplative evenings when you want cinema that challenges conventional notions of heroism."
    },
    {
      name: "International Cinema Gems", 
      description: "Acclaimed films from around the world that transcend cultural boundaries through universal human experiences",
      reasoning: "Cinema is a global language, and these selections remind us that great stories know no borders. Today calls for expanding our perspectives and discovering how different cultures explore similar themes of love, loss, and hope."
    },
    {
      name: "Psychological Thrillers",
      description: "Mind-bending films that keep you guessing while exploring the fragility of perception and reality",
      reasoning: "Sometimes we need films that make us question everything we think we know. These selections challenge our assumptions about truth, memory, and identity—perfect for when you want your entertainment to be as intellectually engaging as it is thrilling."
    },
    {
      name: "Character Study Masterworks",
      description: "Films that dive deep into the human psyche, revealing the complexity of relationships and personal transformation",
      reasoning: "The most compelling stories are about people, not plots. Today's selection focuses on films that understand character is destiny, offering intimate portraits that reveal universal truths about the human condition."
    },
    {
      name: "Visually Stunning Epics",
      description: "Grand-scale films that showcase the power of cinematic storytelling through breathtaking imagery and scope",
      reasoning: "Cinema is the art of the impossible made visible. These selections celebrate the medium's unique ability to transport us to other worlds and times, reminding us why movies are called 'the dream factory.'"
    },
    {
      name: "Elevated Horror Experiences",
      description: "Sophisticated horror films that use fear as a lens to examine deeper social and psychological themes",
      reasoning: "Horror at its best is a mirror held up to society's anxieties and fears. These selections prove that the genre can be both terrifying and intellectually rewarding, using supernatural elements to explore very real human concerns."
    },
    {
      name: "Coming-of-Age Chronicles",
      description: "Authentic stories of growth, discovery, and the painful beauty of transitioning from youth to adulthood",
      reasoning: "We all carry the memory of becoming who we are. These films capture the universal experience of growing up with honesty, humor, and heart—perfect for reflecting on our own journeys of self-discovery."
    },
    {
      name: "Romantic Melancholy",
      description: "Bittersweet love stories that explore the complexity of human connection and the beauty of impermanence",
      reasoning: "Love is cinema's greatest subject, but the most memorable romances understand that happiness is fleeting and beauty often lies in longing. These selections celebrate love in all its complicated, heartbreaking glory."
    },
    {
      name: "Social Commentary Classics",
      description: "Films that use storytelling to examine society, challenge systems, and inspire change through powerful narratives",
      reasoning: "Great cinema has always been a force for social awareness and change. Today's selections prove that entertainment and enlightenment can coexist, offering stories that both engage and educate."
    },
    {
      name: "Auteur Showcases",
      description: "Films that demonstrate the unique vision and artistic voice of cinema's most distinctive directors",
      reasoning: "Cinema is an art form, and these directors are its greatest artists. Today we celebrate the power of personal vision in filmmaking—each selection bears the unmistakable signature of a master storyteller."
    }
  ];

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    try {
      this.apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!this.apiKey) {
        console.warn("VITE_GEMINI_API_KEY environment variable not set. AI features will use fallback logic.");
        this.isInitialized = false;
        return;
      }

      this.genAI = new GoogleGenerativeAI(this.apiKey);
      this.isInitialized = true;
      console.log("AI Recommendation Service initialized successfully");
    } catch (error) {
      console.error("Failed to initialize AI Recommendation Service:", error);
      this.isInitialized = false;
    }
  }

  public isConfigured(): boolean {
    return this.isInitialized && this.genAI !== null;
  }

  // Generate daily curator with optimized concurrent processing and robust error handling
  async generateDailyCurator(): Promise<DailyCuratorResponse> {
    const startTime = Date.now();
    
    return await errorHandlingService.executeWithRetry(
      async () => {
        const curatorResponse = await this.generateDailyCuratorBase();
        
        // Convert AI suggested titles to real TMDB content with optimized processing
        console.log(`Converting ${curatorResponse.suggestedTitles.length} AI suggestions to TMDB content with optimization...`);
        
        let tmdbContent: ContentItem[] = [];
        
        try {
          // Use optimized content processing for better performance
          tmdbContent = await contentProcessingEngine.convertAISuggestionsToTMDB(curatorResponse.suggestedTitles);
          
          // Validate and enrich the content with concurrent processing
          tmdbContent = await this.validateAndEnrichContentOptimized(tmdbContent);
          
          if (tmdbContent.length === 0) {
            throw new ContentProcessingError('No valid TMDB content found after processing and validation', 'daily-curator', 'validation');
          }
          
          console.log(`Successfully converted ${tmdbContent.length}/${curatorResponse.suggestedTitles.length} suggestions to validated TMDB content`);
          
        } catch (processingError) {
          console.warn('TMDB content processing failed, attempting fallback:', processingError);
          
          // Use fallback content with proper error handling
          tmdbContent = await this.getFallbackTMDBContent(curatorResponse.theme);
          
          if (tmdbContent.length === 0) {
            throw new DailySelectionError(
              'Both AI suggestions and fallback content failed to load from TMDB',
              processingError instanceof Error ? processingError : new Error(String(processingError))
            );
          }
        }
        
        const result = {
          ...curatorResponse,
          content: tmdbContent
        };
        
        // Track successful performance
        trackPerformance('generateDailyCurator', startTime, true, {
          service: 'ai',
          contentCount: tmdbContent.length,
          suggestedTitles: curatorResponse.suggestedTitles.length
        });
        
        return result;
      },
      'generateDailyCurator',
      {
        operation: 'generateDailyCurator',
        cachedContent: await this.getCachedDailyContent(),
        retryFunction: () => this.generateDailyCuratorBase()
      }
    ).catch(error => {
      // Track error performance
      trackPerformance('generateDailyCurator', startTime, false, {
        service: 'ai',
        error: error.message
      });
      
      trackError('ai', 'generateDailyCurator', error.message, error.recoverable !== false, {
        errorType: error.constructor.name,
        operation: 'daily-curator-generation'
      });
      
      throw error;
    });
  }

  // Generate base daily curator response with enhanced error handling
  private async generateDailyCuratorBase(): Promise<DailyCuratorResponse> {
    const startTime = Date.now();
    
    if (!this.isConfigured()) {
      trackError('ai', 'generateDailyCuratorBase', 'Gemini AI service not configured', false, {
        operation: 'initialization'
      });
      throw new AIServiceError('Gemini AI service not configured', 'gemini', 'initialization');
    }

    try {
      const model = this.genAI!.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 1000,
        },
      });

      const currentDate = new Date();
      const dateContext = currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const season = this.getCurrentSeason();
      const timeOfDay = this.getTimeOfDay();
      
      const curatorPrompt = `You are a sophisticated AI that creates daily movie curator profiles for a premium streaming service. Generate a realistic, engaging curator persona with deep film expertise who feels authentic and credible.

      CONTEXT FOR TODAY'S CURATION:
      - Date: ${dateContext}
      - Season: ${season}
      - Time context: ${timeOfDay}
      
      Create a curator who could be:
      - A renowned film critic, historian, or scholar (like Pauline Kael, Andrew Sarris, or David Thomson)
      - A celebrated filmmaker, cinematographer, or editor (active or legendary)
      - A film festival programmer, archivist, or museum curator
      - A cinema studies professor, author, or documentary filmmaker
      - A legendary actor with directorial experience or deep film knowledge
      - A contemporary film journalist, podcaster, or cultural critic

      ENHANCED REQUIREMENTS:
      - Must feel like a real person with genuine film expertise and credibility
      - Should have a specific area of specialization that influences their selections
      - Must appeal to both serious cinephiles and curious general audiences
      - Should reflect diverse perspectives (gender, ethnicity, age, geographic background)
      - Theme should feel appropriate for the current date/season context
      - Reasoning should be thoughtful, personal, and contextually relevant

      THEME INSPIRATION (choose something unique and specific):
      - Consider seasonal/temporal relevance (e.g., winter films for cold months, summer adventures)
      - Explore specific movements, eras, or styles (e.g., "Soviet Montage Masters", "New German Cinema")
      - Focus on thematic elements (e.g., "Films About Memory", "Stories of Resilience")
      - Highlight underrepresented voices (e.g., "Women Behind the Camera", "African Cinema Renaissance")
      - Celebrate technical achievements (e.g., "Practical Effects Wizardry", "Sound Design Masterpieces")

      Respond in this exact JSON format:
      {
        "curator": {
          "name": "Full name of the curator (make it feel authentic and credible)",
          "bio": "2-3 sentences highlighting their expertise, background, and unique perspective on cinema",
          "expertise": ["specific area 1", "specific area 2", "specific area 3", "specific area 4", "specific area 5"],
          "description": "One compelling sentence describing their role and specialty"
        },
        "theme": "Specific, evocative theme for today's selection (be creative and precise)",
        "reasoning": "2-3 sentences explaining why this curator chose this theme for today - should feel personal, thoughtful, and contextually relevant to the date/season",
        "suggestedTitles": ["Title 1", "Title 2", "Title 3", "Title 4", "Title 5", "Title 6"]
      }

      TITLE SELECTION STRATEGY:
      - 2 well-known classics that perfectly exemplify the theme
      - 2 hidden gems or international films that showcase depth
      - 1-2 contemporary selections that prove the theme's relevance
      - Mix movies and TV series when appropriate to the theme
      - Ensure all titles are real, searchable content available in TMDB
      - Prioritize quality and thematic coherence over popularity

      Make this feel like a real curator's passionate, informed selection rather than a generic algorithm.`;

      const result = await model.generateContent(curatorPrompt);
      const response = await result.response;
      const jsonText = response.text();
      
      // Clean up the response to extract JSON
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new AIServiceError('Could not extract JSON from AI response', 'gemini', 'content-generation');
      }
      
      const curatorData = JSON.parse(jsonMatch[0]);
      
      // Validate the response structure
      if (!this.validateCuratorResponse(curatorData)) {
        trackError('ai', 'generateDailyCuratorBase', 'AI response validation failed', true, {
          operation: 'response-validation',
          responseStructure: Object.keys(curatorData)
        });
        throw new AIServiceError('AI response is missing required curator fields', 'gemini', 'response-validation');
      }

      // Track successful AI generation
      trackPerformance('generateDailyCuratorBase', startTime, true, {
        service: 'ai',
        model: 'gemini-1.5-flash',
        suggestedTitles: curatorData.suggestedTitles?.length || 0
      });

      return curatorData as DailyCuratorResponse;

    } catch (error) {
      console.error("Error generating daily curator:", error);
      
      // Convert to appropriate error type
      if (error instanceof AIServiceError) {
        throw error;
      }
      
      if (error instanceof SyntaxError) {
        throw new AIServiceError('Failed to parse AI response JSON', 'gemini', 'json-parsing', error);
      }
      
      if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
        throw new AIServiceError('AI service rate limit exceeded', 'gemini', 'rate-limit', error);
      }
      
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        throw new AIServiceError('Network error connecting to AI service', 'gemini', 'network', error);
      }
      
      throw new AIServiceError(
        `Unexpected error in AI curator generation: ${error.message}`,
        'gemini',
        'unknown',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  // Process user chat requests with enhanced AI analysis and robust error handling
  async processUserRequest(message: string, context?: RecommendationContext): Promise<ChatRecommendationResponse> {
    const startTime = Date.now();
    
    return await errorHandlingService.executeWithRetry(
      async () => {
        console.log('Processing user request with Enhanced Chat Recommendation Engine:', message);
        
        try {
          // Use the enhanced chat recommendation engine for sophisticated analysis
          const enhancedResponse = await enhancedChatRecommendationEngine.processUserRequest(
            message, 
            'default', // session ID - could be made dynamic in the future
            context ? this.convertToEnhancedContext(context) : undefined
          );
          
          console.log('Enhanced chat response:', enhancedResponse);
          
          // Track successful chat processing
          trackPerformance('processUserRequest', startTime, true, {
            service: 'ai',
            engine: 'enhanced-chat',
            confidence: enhancedResponse.confidence,
            suggestedTitles: enhancedResponse.suggestedTitles.length,
            contentCount: enhancedResponse.content?.length || 0
          });
          
          // Convert to the expected ChatRecommendationResponse format
          return {
            responseText: enhancedResponse.responseText,
            suggestedTitles: enhancedResponse.suggestedTitles,
            confidence: enhancedResponse.confidence,
            content: enhancedResponse.content
          };
          
        } catch (enhancedError) {
          console.warn('Enhanced chat processing failed, using base implementation:', enhancedError);
          
          // Track enhanced engine failure
          trackError('ai', 'processUserRequest', `Enhanced chat engine failed: ${enhancedError.message}`, true, {
            operation: 'enhanced-chat-fallback',
            fallbackUsed: true
          });
          
          // Fallback to the original implementation
          return await this.processUserRequestBase(message, context);
        }
      },
      'processUserRequest',
      {
        operation: 'processUserRequest',
        userMessage: message,
        retryFunction: () => this.processUserRequestBase(message, context)
      }
    ).catch(error => {
      // Track error performance
      trackPerformance('processUserRequest', startTime, false, {
        service: 'ai',
        error: error.message
      });
      
      trackError('ai', 'processUserRequest', error.message, error.recoverable !== false, {
        errorType: error.constructor.name,
        operation: 'chat-processing',
        userMessage: message.substring(0, 100) // First 100 chars for context
      });
      
      throw error;
    });
  }

  // Process base user chat request (original method)
  private async processUserRequestBase(message: string, context?: RecommendationContext): Promise<ChatRecommendationResponse> {
    if (!this.isConfigured()) {
      return this.getFallbackChatResponse(message, context);
    }

    try {
      const model = this.genAI!.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
        },
      });

      const contextInfo = this.buildContextString(context);
      
      const chatPrompt = `You are an expert movie and TV curator working for a premium streaming service. A user has made this request: "${message}"

      ${contextInfo}

      Your task:
      1. Analyze their request to understand preferences, mood, and specific requirements
      2. Provide thoughtful, personalized recommendations that go beyond obvious choices
      3. Consider hidden gems, international content, and diverse perspectives
      4. Explain your reasoning in an engaging, conversational tone
      5. Suggest 4-6 specific titles that match their request

      Guidelines:
      - Prioritize quality and critical acclaim over pure popularity
      - Include a mix of movies and TV shows when appropriate
      - Consider different eras, genres, and cultural perspectives
      - Be enthusiastic but sophisticated in your tone
      - Avoid overly mainstream or obvious suggestions unless they perfectly fit

      Respond in this exact JSON format:
      {
        "responseText": "Your conversational response explaining the recommendations (2-3 paragraphs)",
        "suggestedTitles": ["Title 1", "Title 2", "Title 3", "Title 4", "Title 5", "Title 6"],
        "confidence": 0.85
      }

      Ensure all suggested titles are real, searchable content that would be found in TMDB.`;

      const result = await model.generateContent(chatPrompt);
      const response = await result.response;
      const jsonText = response.text();
      
      // Clean up the response to extract JSON
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new AIServiceError("Could not extract JSON from AI response", "gemini");
      }
      
      const chatData = JSON.parse(jsonMatch[0]);
      
      // Validate the response structure
      if (!this.validateChatResponse(chatData)) {
        throw new AIServiceError("AI response is missing required chat fields", "gemini");
      }

      return chatData as ChatRecommendationResponse;

    } catch (error) {
      console.error("Error processing user request:", error);
      
      if (error instanceof AIServiceError) {
        throw error;
      }
      
      // For other errors, fall back to rule-based response
      console.log("Falling back to rule-based response due to AI error");
      return this.getFallbackChatResponse(message, context);
    }
  }

  // Generate content suggestions by theme with TMDB integration
  async suggestContentByTheme(theme: string, count: number = 6): Promise<ContentItem[]> {
    try {
      const titles = await this.suggestTitlesByTheme(theme, count);
      const tmdbContent = await contentProcessingEngine.convertAISuggestionsToTMDB(titles);
      
      if (tmdbContent.length === 0) {
        console.warn(`No TMDB content found for theme "${theme}", using fallback`);
        return await this.getFallbackTMDBContent(theme);
      }
      
      return tmdbContent;
    } catch (error) {
      console.error(`Error suggesting content by theme "${theme}":`, error);
      return await this.getFallbackTMDBContent(theme);
    }
  }

  // Generate title suggestions by theme (original method)
  private async suggestTitlesByTheme(theme: string, count: number = 6): Promise<string[]> {
    if (!this.isConfigured()) {
      return this.getFallbackContentByTheme(theme, count);
    }

    try {
      const model = this.genAI!.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 400,
        },
      });

      const themePrompt = `Generate ${count} excellent movie and TV show recommendations for the theme: "${theme}"

      Requirements:
      - Mix of movies and TV series
      - Include both well-known and hidden gem titles
      - Prioritize critical acclaim and quality
      - Ensure all titles are real and searchable in TMDB
      - Avoid overly obvious or mainstream choices unless they perfectly fit

      Respond with only a JSON array of title strings:
      ["Title 1", "Title 2", "Title 3", ...]`;

      const result = await model.generateContent(themePrompt);
      const response = await result.response;
      const jsonText = response.text();
      
      // Clean up the response to extract JSON array
      const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new AIServiceError("Could not extract JSON array from AI response", "gemini");
      }
      
      const titles = JSON.parse(jsonMatch[0]);
      
      if (!Array.isArray(titles) || titles.length === 0) {
        throw new AIServiceError("AI response is not a valid array of titles", "gemini");
      }

      return titles.slice(0, count);

    } catch (error) {
      console.error("Error generating content by theme:", error);
      return this.getFallbackContentByTheme(theme, count);
    }
  }

  // Generate sophisticated curator persona
  async generateCuratorPersona(): Promise<CuratorPersona> {
    if (!this.isConfigured()) {
      return this.getRandomFallbackCurator();
    }

    try {
      const model = this.genAI!.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 400,
        },
      });

      const personaPrompt = `Create a sophisticated, authentic movie curator persona for a premium streaming service. This should feel like a real film industry professional with genuine expertise and credibility.

      CURATOR TYPES TO CONSIDER:
      - Renowned film critics or historians (like Pauline Kael, Andrew Sarris, Roger Ebert legacy)
      - Celebrated filmmakers, cinematographers, or editors (active or legendary)
      - Film festival programmers, archivists, or museum curators
      - Cinema studies professors, authors, or documentary filmmakers
      - Cultural critics, journalists, or podcast hosts with film expertise
      - Actors with directorial experience or deep film knowledge

      REQUIREMENTS:
      - Must feel authentic and credible (could be inspired by real people but create original persona)
      - Should represent diverse perspectives (gender, ethnicity, age, geographic background)
      - Must have specific areas of expertise that influence their curation style
      - Should appeal to both serious cinephiles and curious general audiences
      - Include unique background details that inform their perspective

      EXPERTISE AREAS (choose 4-5 specific ones):
      - Genre specializations (Film Noir, Horror, Sci-Fi, etc.)
      - Cultural/Regional cinema (French New Wave, Korean Cinema, etc.)
      - Technical aspects (Cinematography, Sound Design, Editing, etc.)
      - Thematic focuses (Social Commentary, Coming-of-Age, etc.)
      - Historical periods or movements
      - Industry roles (Festival Programming, Film Preservation, etc.)

      Respond in this exact JSON format:
      {
        "name": "Full name (make it feel authentic and memorable)",
        "bio": "2-3 sentences highlighting their background, expertise, and unique perspective on cinema",
        "expertise": ["specific area 1", "specific area 2", "specific area 3", "specific area 4", "specific area 5"],
        "description": "One compelling sentence describing their role and what makes them special"
      }

      Make this feel like a real person with a genuine passion for cinema and unique insights to share.`;

      const result = await model.generateContent(personaPrompt);
      const response = await result.response;
      const jsonText = response.text();
      
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new AIServiceError("Could not extract JSON from AI response", "gemini");
      }
      
      const persona = JSON.parse(jsonMatch[0]);
      
      if (!this.validateCuratorPersona(persona)) {
        throw new AIServiceError("AI response is missing required persona fields", "gemini");
      }

      return persona as CuratorPersona;

    } catch (error) {
      console.error("Error generating curator persona:", error);
      return this.getRandomFallbackCurator();
    }
  }

  // Get fallback TMDB content for a given theme
  private async getFallbackTMDBContent(theme: string): Promise<ContentItem[]> {
    try {
      // Enhanced title mapping with more sophisticated selections
      const titlesByTheme: Record<string, string[]> = {
        "Neo-Noir Masterpieces": ["Blade Runner 2049", "Drive", "Nightcrawler", "The Long Good Friday", "Chinatown", "L.A. Confidential"],
        "International Cinema Gems": ["Parasite", "Roma", "Amélie", "The Handmaiden", "Burning", "Portrait of a Lady on Fire"],
        "Psychological Thrillers": ["Black Swan", "Shutter Island", "Gone Girl", "Zodiac", "Prisoners", "The Machinist"],
        "Character Study Masterworks": ["There Will Be Blood", "Her", "Manchester by the Sea", "The Master", "Phantom Thread", "Marriage Story"],
        "Visually Stunning Epics": ["Lawrence of Arabia", "2001: A Space Odyssey", "Mad Max: Fury Road", "Dune", "The Revenant", "Apocalypse Now"],
        "Elevated Horror Experiences": ["Hereditary", "The Witch", "Get Out", "Midsommar", "The Babadook", "It Follows"],
        "Coming-of-Age Chronicles": ["Lady Bird", "Moonlight", "Call Me by Your Name", "The 400 Blows", "Boyhood", "Eighth Grade"],
        "Romantic Melancholy": ["In the Mood for Love", "Her", "Eternal Sunshine of the Spotless Mind", "Lost in Translation", "Blue Is the Warmest Color", "Carol"],
        "Social Commentary Classics": ["Parasite", "Get Out", "Do the Right Thing", "Sorry to Bother You", "The Handmaid's Tale", "Atlanta"],
        "Auteur Showcases": ["Mulholland Drive", "The Grand Budapest Hotel", "Persona", "8½", "Synecdoche, New York", "The Tree of Life"]
      };

      const fallbackTitles = titlesByTheme[theme] || ["The Godfather", "Pulp Fiction", "Goodfellas", "Taxi Driver", "The Dark Knight", "Casablanca"];
      
      console.log(`Getting fallback TMDB content for theme: ${theme}`);
      const tmdbContent = await contentProcessingEngine.convertAISuggestionsToTMDB(fallbackTitles);
      
      if (tmdbContent.length === 0) {
        console.warn('Even fallback content failed to load from TMDB, using empty array');
      }
      
      return tmdbContent;
    } catch (error) {
      console.error('Error getting fallback TMDB content:', error);
      return [];
    }
  }

  // Enhanced fallback methods for when AI is unavailable
  private async getFallbackDailyCurator(): Promise<DailyCuratorResponse> {
    const curator = this.getRandomFallbackCurator();
    const theme = this.getContextualFallbackTheme();
    
    // Get real TMDB content for the fallback theme
    const content = await this.getFallbackTMDBContent(theme.name);
    const suggestedTitles = content.map(item => item.title);

    return {
      curator,
      theme: theme.name,
      reasoning: this.getContextualReasoning(theme.reasoning, curator),
      suggestedTitles,
      content
    };
  }

  private getContextualFallbackTheme(): { name: string; description: string; reasoning: string } {
    const season = this.getCurrentSeason();
    const timeOfDay = this.getTimeOfDay();
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    
    // Select theme based on context
    let contextualThemes = [...this.fallbackThemes];
    
    // Seasonal preferences
    if (season === "Winter") {
      contextualThemes = contextualThemes.filter(t => 
        t.name.includes("Character Study") || 
        t.name.includes("Psychological") || 
        t.name.includes("Romantic Melancholy")
      );
    } else if (season === "Summer") {
      contextualThemes = contextualThemes.filter(t => 
        t.name.includes("Visually Stunning") || 
        t.name.includes("International") || 
        t.name.includes("Coming-of-Age")
      );
    }
    
    // Weekend vs weekday preferences
    if (dayOfWeek === "Friday" || dayOfWeek === "Saturday") {
      contextualThemes = contextualThemes.filter(t => 
        t.name.includes("Elevated Horror") || 
        t.name.includes("Visually Stunning") || 
        t.name.includes("Auteur")
      );
    }
    
    // If no contextual themes match, use all themes
    if (contextualThemes.length === 0) {
      contextualThemes = this.fallbackThemes;
    }
    
    return contextualThemes[Math.floor(Math.random() * contextualThemes.length)];
  }

  private getContextualReasoning(baseReasoning: string, curator: CuratorPersona): string {
    const season = this.getCurrentSeason();
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    
    // Add contextual elements to the reasoning
    let contextualPrefix = "";
    
    if (dayOfWeek === "Monday") {
      contextualPrefix = "As we begin a new week, ";
    } else if (dayOfWeek === "Friday") {
      contextualPrefix = "As the week winds down, ";
    } else if (dayOfWeek === "Saturday" || dayOfWeek === "Sunday") {
      contextualPrefix = "This weekend calls for ";
    }
    
    if (season === "Winter") {
      contextualPrefix += "the introspective mood of winter makes this ";
    } else if (season === "Summer") {
      contextualPrefix += "the expansive energy of summer invites ";
    }
    
    return contextualPrefix + baseReasoning.toLowerCase();
  }

  // Get fallback TMDB content for chat based on message analysis
  private async getFallbackChatTMDBContent(message: string): Promise<ContentItem[]> {
    try {
      const lowerMessage = message.toLowerCase();
      let fallbackTitles: string[] = [];

      // Rule-based title selection based on message content
      if (lowerMessage.includes('sci-fi') || lowerMessage.includes('science fiction')) {
        fallbackTitles = ["Arrival", "Ex Machina", "Her", "Annihilation", "Blade Runner 2049", "The Lobster"];
      } else if (lowerMessage.includes('horror')) {
        fallbackTitles = ["Hereditary", "The Witch", "Get Out", "Midsommar", "The Babadook", "It Follows"];
      } else if (lowerMessage.includes('comedy') || lowerMessage.includes('funny')) {
        fallbackTitles = ["The Grand Budapest Hotel", "Parasite", "Knives Out", "Hunt for the Wilderpeople", "What We Do in the Shadows", "The Nice Guys"];
      } else if (lowerMessage.includes('action')) {
        fallbackTitles = ["Mad Max: Fury Road", "John Wick", "The Raid", "Baby Driver", "Mission: Impossible - Fallout", "Atomic Blonde"];
      } else if (lowerMessage.includes('tv') || lowerMessage.includes('series') || lowerMessage.includes('show')) {
        fallbackTitles = ["The Sopranos", "Breaking Bad", "The Wire", "True Detective", "Fargo", "Better Call Saul"];
      } else if (lowerMessage.includes('international') || lowerMessage.includes('foreign')) {
        fallbackTitles = ["Parasite", "Roma", "Burning", "The Handmaiden", "Shoplifters", "Cold War"];
      } else {
        fallbackTitles = ["The Godfather", "Pulp Fiction", "Spirited Away", "Moonlight", "There Will Be Blood", "The Social Network"];
      }

      console.log(`Getting fallback chat TMDB content for message analysis`);
      const tmdbContent = await contentProcessingEngine.convertAISuggestionsToTMDB(fallbackTitles);
      
      if (tmdbContent.length === 0) {
        console.warn('Even fallback chat content failed to load from TMDB');
      }
      
      return tmdbContent;
    } catch (error) {
      console.error('Error getting fallback chat TMDB content:', error);
      return [];
    }
  }

  private async getFallbackChatResponse(message: string, context?: RecommendationContext): Promise<ChatRecommendationResponse> {
    const lowerMessage = message.toLowerCase();
    let responseText = "";
    let suggestedTitles: string[] = [];
    let confidence = 0.7;

    // Rule-based analysis of user request
    if (lowerMessage.includes('sci-fi') || lowerMessage.includes('science fiction')) {
      responseText = "I can see you're drawn to science fiction! I've selected some thought-provoking sci-fi films that go beyond typical blockbusters. These selections blend spectacular visuals with deep philosophical questions about humanity, technology, and our future.";
      suggestedTitles = ["Arrival", "Ex Machina", "Her", "Annihilation", "Blade Runner 2049", "The Lobster"];
    } else if (lowerMessage.includes('horror')) {
      responseText = "For horror enthusiasts, I've curated films that prioritize psychological tension and artistic merit over cheap scares. These selections showcase how horror can be both terrifying and intellectually engaging, exploring deeper themes about human nature and society.";
      suggestedTitles = ["Hereditary", "The Witch", "Get Out", "Midsommar", "The Babadook", "It Follows"];
    } else if (lowerMessage.includes('comedy') || lowerMessage.includes('funny')) {
      responseText = "Comedy is an art form, and these selections prove it! I've chosen films that blend humor with heart, intelligence, and social commentary. These aren't just funny movies—they're smart, well-crafted stories that happen to make you laugh.";
      suggestedTitles = ["The Grand Budapest Hotel", "Parasite", "Knives Out", "Hunt for the Wilderpeople", "What We Do in the Shadows", "The Nice Guys"];
    } else if (lowerMessage.includes('action')) {
      responseText = "Action cinema at its finest! These selections elevate the genre through exceptional choreography, practical effects, and compelling characters. Each film proves that action movies can be both thrilling and artistically accomplished.";
      suggestedTitles = ["Mad Max: Fury Road", "John Wick", "The Raid", "Baby Driver", "Mission: Impossible - Fallout", "Atomic Blonde"];
    } else if (lowerMessage.includes('tv') || lowerMessage.includes('series') || lowerMessage.includes('show')) {
      responseText = "Television has reached new artistic heights! These series represent the golden age of TV, offering cinematic quality storytelling with the depth that only long-form narrative can provide. Each show is a masterclass in character development and world-building.";
      suggestedTitles = ["The Sopranos", "Breaking Bad", "The Wire", "True Detective", "Fargo", "Better Call Saul"];
    } else if (lowerMessage.includes('international') || lowerMessage.includes('foreign')) {
      responseText = "International cinema offers perspectives and storytelling approaches you won't find anywhere else. These selections showcase the diversity and richness of global filmmaking, proving that great stories transcend language and cultural barriers.";
      suggestedTitles = ["Parasite", "Roma", "Burning", "The Handmaiden", "Shoplifters", "Cold War"];
    } else {
      responseText = "Based on your request, I've selected a diverse mix of critically acclaimed films that represent the best of contemporary cinema. These selections balance artistic merit with entertainment value, offering something for every mood and moment.";
      suggestedTitles = ["The Godfather", "Pulp Fiction", "Spirited Away", "Moonlight", "There Will Be Blood", "The Social Network"];
    }

    // Get real TMDB content for the fallback response
    const content = await this.getFallbackChatTMDBContent(message);

    return {
      responseText,
      suggestedTitles,
      confidence,
      content
    };
  }

  private getFallbackContentByTheme(theme: string, count: number): string[] {
    const themeMap: Record<string, string[]> = {
      "neo-noir": ["Blade Runner 2049", "Drive", "Nightcrawler", "The Long Good Friday", "Chinatown", "L.A. Confidential"],
      "international": ["Parasite", "Roma", "Amélie", "The Handmaiden", "Burning", "Portrait of a Lady on Fire"],
      "thriller": ["Gone Girl", "Zodiac", "Prisoners", "Shutter Island", "No Country for Old Men", "Heat"],
      "drama": ["There Will Be Blood", "Manchester by the Sea", "Moonlight", "The Master", "Her", "Marriage Story"],
      "action": ["Mad Max: Fury Road", "John Wick", "The Raid", "Baby Driver", "Mission: Impossible", "Atomic Blonde"]
    };

    const lowerTheme = theme.toLowerCase();
    for (const [key, titles] of Object.entries(themeMap)) {
      if (lowerTheme.includes(key)) {
        return titles.slice(0, count);
      }
    }

    // Default fallback
    return ["The Godfather", "Pulp Fiction", "Goodfellas", "Taxi Driver", "The Dark Knight", "Casablanca"].slice(0, count);
  }

  private getRandomFallbackCurator(): CuratorPersona {
    // Select curator based on context for more sophisticated fallback
    const season = this.getCurrentSeason();
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    
    let contextualCurators = [...this.fallbackCurators];
    
    // Weekend selections might favor more experimental or challenging curators
    if (dayOfWeek === "Saturday" || dayOfWeek === "Sunday") {
      contextualCurators = this.fallbackCurators.filter(c => 
        c.expertise.includes("Art House") || 
        c.expertise.includes("International Cinema") ||
        c.expertise.includes("Psychological Horror") ||
        c.expertise.includes("Visual Poetry")
      );
    }
    
    // Winter might favor more introspective curators
    if (season === "Winter") {
      contextualCurators = this.fallbackCurators.filter(c => 
        c.expertise.includes("Character Studies") || 
        c.expertise.includes("Romantic Drama") ||
        c.expertise.includes("Social Commentary")
      );
    }
    
    // If no contextual match, use all curators
    if (contextualCurators.length === 0) {
      contextualCurators = this.fallbackCurators;
    }
    
    return contextualCurators[Math.floor(Math.random() * contextualCurators.length)];
  }

  // Validation methods
  private validateCuratorResponse(data: any): boolean {
    return data && 
           data.curator && 
           typeof data.curator.name === 'string' &&
           typeof data.curator.bio === 'string' &&
           Array.isArray(data.curator.expertise) &&
           typeof data.curator.description === 'string' &&
           typeof data.theme === 'string' &&
           typeof data.reasoning === 'string' &&
           Array.isArray(data.suggestedTitles);
  }

  private validateChatResponse(data: any): boolean {
    return data && 
           typeof data.responseText === 'string' &&
           Array.isArray(data.suggestedTitles) &&
           typeof data.confidence === 'number';
  }

  private validateCuratorPersona(data: any): boolean {
    return data && 
           typeof data.name === 'string' &&
           typeof data.bio === 'string' &&
           Array.isArray(data.expertise) &&
           typeof data.description === 'string';
  }

  // Helper methods
  private getCurrentSeason(): string {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return "Spring";
    if (month >= 5 && month <= 7) return "Summer";
    if (month >= 8 && month <= 10) return "Fall";
    return "Winter";
  }

  private getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Morning";
    if (hour >= 12 && hour < 17) return "Afternoon";
    if (hour >= 17 && hour < 21) return "Evening";
    return "Night";
  }

  // Validate and enrich TMDB content for daily selections
  private async validateAndEnrichContent(content: ContentItem[]): Promise<ContentItem[]> {
    try {
      const validatedContent: ContentItem[] = [];
      
      for (const item of content) {
        // Basic validation
        if (!item.title || item.title.trim().length === 0) {
          console.warn(`Skipping content with invalid title: ${JSON.stringify(item)}`);
          continue;
        }
        
        // Skip adult content for general recommendations
        if (item.isAdult) {
          console.log(`Skipping adult content: ${item.title}`);
          continue;
        }
        
        // Enrich with additional metadata if needed
        const enrichedItem = await contentProcessingEngine.enrichContentWithMetadata(item);
        validatedContent.push(enrichedItem);
      }
      
      return validatedContent;
    } catch (error) {
      console.error('Error validating and enriching content:', error);
      return content; // Return original content if enrichment fails
    }
  }

  // Handle TMDB search failures with proper error reporting
  private handleTMDBSearchFailure(titles: string[], error: Error): DailySelectionError {
    if (error instanceof ContentProcessingError) {
      return new DailySelectionError(
        `Failed to process content titles: ${titles.join(', ')}`,
        error,
        error.recoverable
      );
    } else if (error instanceof TMDBServiceError) {
      return new DailySelectionError(
        `TMDB service error while searching for: ${titles.join(', ')}`,
        error,
        error.recoverable
      );
    } else {
      return new DailySelectionError(
        `Unknown error while processing titles: ${titles.join(', ')}`,
        error,
        false
      );
    }
  }

  private buildContextString(context?: RecommendationContext): string {
    if (!context) return "";

    let contextStr = "";
    
    if (context.userPreferences) {
      const prefs = context.userPreferences;
      contextStr += `User preferences: `;
      if (prefs.genres.length > 0) contextStr += `Likes ${prefs.genres.join(', ')}. `;
      if (prefs.excludedGenres.length > 0) contextStr += `Dislikes ${prefs.excludedGenres.join(', ')}. `;
      if (prefs.contentTypes.length > 0) contextStr += `Prefers ${prefs.contentTypes.join(' and ')}. `;
      if (prefs.minRating > 0) contextStr += `Minimum rating: ${prefs.minRating}. `;
    }

    if (context.currentMood) {
      contextStr += `Current mood: ${context.currentMood}. `;
    }

    if (context.sessionHistory.length > 0) {
      contextStr += `Recent requests: ${context.sessionHistory.slice(-3).join(', ')}. `;
    }

    return contextStr;
  }

  // Convert RecommendationContext to enhanced chat context format
  private convertToEnhancedContext(context: RecommendationContext): any {
    return {
      sessionHistory: context.sessionHistory || [],
      previousRecommendations: context.previousRecommendations || [],
      userPreferences: context.userPreferences ? {
        genres: context.userPreferences.genres || [],
        excludedGenres: context.userPreferences.excludedGenres || [],
        contentTypes: context.userPreferences.contentTypes || [],
        minRating: context.userPreferences.minRating || 0,
        maxRuntime: context.userPreferences.maxRuntime,
        preferredDecades: context.userPreferences.preferredDecades || [],
        languages: [], // Not in original context
        moods: [], // Not in original context
        themes: [], // Not in original context
        specificRequests: context.specificRequests || []
      } : {},
      currentMood: context.currentMood,
      conversationFlow: 'initial' as const,
      lastInteractionTime: new Date()
    };
  }

  // Optimized content validation and enrichment with concurrent processing
  private async validateAndEnrichContentOptimized(content: ContentItem[]): Promise<ContentItem[]> {
    if (content.length === 0) return content;

    console.log(`Optimizing validation and enrichment for ${content.length} content items`);

    try {
      // Create concurrent validation and enrichment requests
      const enrichmentRequests = content.map((item, index) => ({
        id: `enrich_${item.tmdb_id}_${index}`,
        request: async () => {
          try {
            // Validate content quality first
            if (!this.validateContentQuality(item)) {
              return null;
            }

            // Enrich with additional metadata if needed
            const enriched = await this.enrichSingleContent(item);
            return enriched;
          } catch (error) {
            console.warn(`Failed to validate/enrich content ${item.title}:`, error);
            return null;
          }
        }
      }));

      // Use performance optimization service for concurrent processing
      const enrichmentResult = await performanceOptimizationService.optimizeConcurrentAIRequests(
        enrichmentRequests,
        { enableCache: true, priority: 'high' }
      );

      // Filter out null results and return valid content
      const validContent = enrichmentResult.results.filter((item): item is ContentItem => item !== null);
      
      console.log(`Content optimization completed: ${validContent.length}/${content.length} items validated and enriched`);
      return validContent;
    } catch (error) {
      console.error('Error in optimized content validation:', error);
      // Fallback to original validation method
      return await this.validateAndEnrichContent(content);
    }
  }

  // Optimized single content enrichment
  private async enrichSingleContent(content: ContentItem): Promise<ContentItem> {
    try {
      // Add any missing streaming URLs or metadata
      if (!content.streamUrl && (content.imdb_id || content.tmdb_id)) {
        const id = content.imdb_id || content.tmdb_id;
        content.streamUrl = tmdbService.getStreamingUrl(id, content.type);
      }

      // Add quality indicators
      const enriched = {
        ...content,
        qualityScore: this.calculateContentQuality(content),
        isHighQuality: content.rating >= 7.0 && content.voteCount >= 100,
        isPopular: content.popularity >= 10
      };

      return enriched;
    } catch (error) {
      console.warn(`Failed to enrich content ${content.title}:`, error);
      return content;
    }
  }

  // Calculate content quality score
  private calculateContentQuality(content: ContentItem): number {
    let score = 0;

    // Rating contribution (0-40 points)
    if (content.rating > 0) {
      score += Math.min(content.rating * 4, 40);
    }

    // Vote count contribution (0-20 points)
    if (content.voteCount > 0) {
      const voteScore = Math.min(Math.log10(content.voteCount + 1) * 5, 20);
      score += voteScore;
    }

    // Popularity contribution (0-20 points)
    if (content.popularity > 0) {
      const popularityScore = Math.min(Math.log10(content.popularity + 1) * 4, 20);
      score += popularityScore;
    }

    // Completeness bonus (0-20 points)
    let completenessScore = 0;
    if (content.poster && !content.poster.includes('null')) completenessScore += 5;
    if (content.backdropPath && !content.backdropPath.includes('null')) completenessScore += 5;
    if (content.overview && content.overview.length > 50) completenessScore += 5;
    if (content.genres && content.genres.length > 0) completenessScore += 5;
    score += completenessScore;

    return Math.min(score, 100);
  }

  // Validate content quality
  private validateContentQuality(content: ContentItem): boolean {
    // Check for essential fields
    if (!content.title || content.title.trim().length === 0) {
      return false;
    }

    // Check for adult content (optional filter)
    if (content.isAdult) {
      return false;
    }

    // Check rating validity
    if (content.rating < 0 || content.rating > 10) {
      return false;
    }

    return true;
  }

  // Get cached daily content for error recovery
  private async getCachedDailyContent(): Promise<ContentItem[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const cacheKey = `daily_content_${today}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        const parsedCache = JSON.parse(cached);
        return parsedCache.content || [];
      }
    } catch (error) {
      console.warn('Failed to retrieve cached daily content:', error);
    }
    
    return [];
  }

  // Enhanced fallback TMDB content with better error handling
  private async getFallbackTMDBContent(theme: string): Promise<ContentItem[]> {
    try {
      console.log(`Generating fallback TMDB content for theme: ${theme}`);
      
      // Define fallback content based on theme
      const fallbackTitles = this.getFallbackTitlesByTheme(theme);
      
      // Try to convert fallback titles to TMDB content
      const tmdbContent = await contentProcessingEngine.convertAISuggestionsToTMDB(fallbackTitles);
      
      if (tmdbContent.length > 0) {
        console.log(`Successfully generated ${tmdbContent.length} fallback TMDB items`);
        return tmdbContent;
      }
      
      console.warn('Fallback TMDB content generation failed, returning empty array');
      return [];
    } catch (error) {
      console.error('Error generating fallback TMDB content:', error);
      return [];
    }
  }

  // Get fallback titles based on theme
  private getFallbackTitlesByTheme(theme: string): string[] {
    const lowerTheme = theme.toLowerCase();
    
    if (lowerTheme.includes('noir') || lowerTheme.includes('crime')) {
      return ["The Maltese Falcon", "Double Indemnity", "The Third Man", "Chinatown", "L.A. Confidential", "Blade Runner"];
    } else if (lowerTheme.includes('international') || lowerTheme.includes('world')) {
      return ["Seven Samurai", "8½", "The Rules of the Game", "Tokyo Story", "Bicycle Thieves", "Persona"];
    } else if (lowerTheme.includes('horror') || lowerTheme.includes('psychological')) {
      return ["Psycho", "The Exorcist", "Rosemary's Baby", "The Shining", "Hereditary", "Get Out"];
    } else if (lowerTheme.includes('comedy')) {
      return ["Some Like It Hot", "The Grand Budapest Hotel", "Dr. Strangelove", "Annie Hall", "Parasite", "The Nice Guys"];
    } else if (lowerTheme.includes('sci-fi') || lowerTheme.includes('science')) {
      return ["2001: A Space Odyssey", "Blade Runner", "Alien", "The Matrix", "Arrival", "Ex Machina"];
    } else if (lowerTheme.includes('romance') || lowerTheme.includes('love')) {
      return ["Casablanca", "Roman Holiday", "Before Sunrise", "Her", "The Princess Bride", "Eternal Sunshine of the Spotless Mind"];
    } else {
      // Default high-quality selection
      return ["The Godfather", "Citizen Kane", "Vertigo", "Pulp Fiction", "The Shawshank Redemption", "Goodfellas"];
    }
  }
}

// Export singleton instance
export const aiRecommendationService = new AIRecommendationService();
export default aiRecommendationService;