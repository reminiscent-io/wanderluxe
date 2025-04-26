import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useParams } from "react-router-dom";

type Message = {
  id: string;
  type: "user" | "bot";
  content: string;
  suggestions?: TravelOption[];
};

type TravelOption = {
  title: string;
  description?: string;
  cost?: number;
};

const ResearchView: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const sendQuery = async () => {
    if (!query.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), type: "user", content: query },
    ]);
    setQuery("");
    setLoading(true);

    try {
      // INVOKE the Edge Function
      const { data, error } = await supabase.functions.invoke("research-chat", {
        body: JSON.stringify({ query, tripId }),
      });
      if (error) throw error;

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          type: "bot",
          content: data.answer,
          suggestions: data.suggestions,
        },
      ]);
    } catch (err: any) {
      console.error("Error calling research API:", err);
      toast.error("Failed to get a response. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToItinerary = async (option: TravelOption) => {
    try {
      const { error } = await supabase.from("day_activities").insert([
        {
          trip_id: tripId,
          title: option.title,
          description: option.description || "",
          cost: option.cost || null,
          currency: "USD",
          is_paid: false,
        },
      ]);
      if (error) throw error;
      toast.success(`Added "${option.title}" to your trip!`);
    } catch (error) {
      console.error("Error adding to itinerary:", error);
      toast.error("Failed to add to your trip");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendQuery();
    }
  };

  return (
    <div className="py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-1">Trip Research Assistant</h2>
        <p className="text-muted-foreground">
          Ask questions about your destination to get travel recommendations and insights.
        </p>
      </div>

      <div className="flex flex-col gap-4 mb-6 max-h-[600px] overflow-y-auto p-2">
        {messages.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-lg">
            <p className="text-gray-500">
              Try asking questions like “What are the best restaurants in Paris?”
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <Card
              key={msg.id}
              className={
                msg.type === "user" ? "bg-secondary/40 ml-10" : "mr-10"
              }
            >
              <CardContent className="pt-4">
                <div className="font-medium mb-1">
                  {msg.type === "user" ? "You" : "Research Assistant"}
                </div>
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {msg.type === "bot" && msg.suggestions?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <div className="w-full text-sm font-medium mb-1">
                      Suggested activities:
                    </div>
                    {msg.suggestions.map((opt, i) => (
                      <Button
                        key={i}
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddToItinerary(opt)}
                      >
                        Add “{opt.title}”
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}

        {loading && (
          <div className="flex justify-center items-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>

      <div className="flex gap-2 items-center">
        <Input
          placeholder="Ask about your destination..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          className="flex-1"
        />
        <Button onClick={sendQuery} disabled={loading || !query.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
);

export default ResearchView;
