
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface Movie {
  title: string;
  year: number;
  director: string;
  synopsis: string;
  posterUrl: string;
}

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.warn("VITE_GEMINI_API_KEY environment variable not set. AI features will not work.");
}

const genAI = new GoogleGenerativeAI(API_KEY || "");

export const generateMovieSuggestion = async (prompt: string): Promise<Movie> => {
  if (!API_KEY) {
    throw new Error("API key is not configured.");
  }
  
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.8,
      },
    });

    const moviePrompt = `Suggest a single, excellent movie based on this request: "${prompt}". Avoid mainstream blockbusters unless they are a perfect fit. Focus on critically acclaimed or cult classic films.

    Please respond in the following JSON format:
    {
      "title": "The full title of the movie",
      "year": year_as_number,
      "director": "Director's name",
      "synopsis": "A brief, compelling one or two-sentence synopsis",
      "posterUrl": "https://picsum.photos/seed/movietitle/300/450"
    }

    For the posterUrl, use the movie title in lowercase with no spaces as the seed.`;

    const result = await model.generateContent(moviePrompt);
    const response = await result.response;
    const jsonText = response.text();
    
    // Clean up the response to extract JSON
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not extract JSON from AI response");
    }
    
    const movieData = JSON.parse(jsonMatch[0]);
    
    // Simple validation
    if (!movieData.title || !movieData.year || !movieData.director || !movieData.synopsis) {
        throw new Error("AI response is missing required movie fields.");
    }

    return movieData as Movie;

  } catch (error) {
    console.error("Error generating movie suggestion:", error);
    // Refine error message for user
    if (error instanceof Error && error.message.includes('json')) {
        throw new Error("The AI returned an invalid format. Please try again.");
    }
    throw new Error("Failed to get a suggestion from the AI. The model may be busy or an error occurred.");
  }
};
