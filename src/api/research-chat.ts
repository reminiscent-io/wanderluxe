
import { supabase } from "@/integrations/supabase/client";

type TravelOption = {
  title: string;
  description?: string;
  cost?: number;
};

export const sendResearchQuery = async (query: string, tripId: string) => {
  try {
    // Check if API key exists
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('user_settings')
      .select('perplexity_api_key')
      .single();
      
    if (apiKeyError || !apiKeyData?.perplexity_api_key) {
      return { 
        answer: "Please add your Perplexity API key in your profile settings to use the research assistant.",
        suggestions: [] 
      };
    }
    
    // Get trip details to include in the query context
    const { data: tripData } = await supabase
      .from('trips')
      .select('destination, start_date, end_date')
      .eq('trip_id', tripId)
      .single();
      
    // Enhance the query with trip context
    const enhancedQuery = tripData 
      ? `Context: Planning a trip to ${tripData.destination} from ${tripData.start_date} to ${tripData.end_date}.\n\nUser query: ${query}`
      : query;
    
    // Call the Perplexity API
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKeyData.perplexity_api_key}`,
      },
      body: JSON.stringify({
        model: "llama-3-sonar-small-32k-0718",
        messages: [
          {
            role: "system",
            content: "You are a helpful travel assistant. Provide detailed answers about travel destinations, activities, restaurants, and attractions. When appropriate, include 2-4 specific suggestions that could be added to an itinerary. Format each suggestion with a title, short description, and estimated cost when possible."
          },
          {
            role: "user",
            content: enhancedQuery
          }
        ],
        max_tokens: 1024
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Perplexity API error:", errorData);
      return { 
        answer: "Sorry, I couldn't get a response from the AI service. Please try again later.", 
        suggestions: [] 
      };
    }

    const data = await response.json();
    const answer = data.choices[0]?.message.content || "Sorry, I couldn't generate a response.";
    
    // Parse suggestions from the answer (this is simplified - you might need more robust parsing)
    const suggestions: TravelOption[] = [];
    const suggestionRegex = /\*\*(.*?)\*\*:\s*(.*?)(?:\$(\d+))?(?:\n|$)/g;
    let match;
    
    while ((match = suggestionRegex.exec(answer)) !== null) {
      suggestions.push({
        title: match[1],
        description: match[2],
        cost: match[3] ? parseInt(match[3]) : undefined
      });
    }

    return {
      answer,
      suggestions
    };
  } catch (error) {
    console.error("Error in research chat:", error);
    return { 
      answer: "An error occurred while processing your request. Please try again.", 
      suggestions: [] 
    };
  }
};
