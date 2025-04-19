
import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const ProfileAPISettings: React.FC = () => {
  const { user } = useAuth();
  const [perplexityApiKey, setPerplexityApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchApiKeys();
    }
  }, [user]);

  const fetchApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('perplexity_api_key')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching API keys:", error);
        return;
      }

      if (data?.perplexity_api_key) {
        setPerplexityApiKey(data.perplexity_api_key);
      }
    } catch (error) {
      console.error("Error in fetchApiKeys:", error);
    }
  };

  const saveApiKey = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Check if record exists
      const { data, error: fetchError } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (data) {
        // Update existing record
        const { error } = await supabase
          .from('user_settings')
          .update({ perplexity_api_key: perplexityApiKey })
          .eq('user_id', user.id);
          
        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('user_settings')
          .insert([{ user_id: user.id, perplexity_api_key: perplexityApiKey }]);
          
        if (error) throw error;
      }

      toast.success("API key saved successfully");
    } catch (error) {
      console.error("Error saving API key:", error);
      toast.error("Failed to save API key");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>API Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="perplexity-api-key">Perplexity API Key</Label>
            <div className="flex">
              <Input
                id="perplexity-api-key"
                type={showApiKey ? "text" : "password"}
                value={perplexityApiKey}
                onChange={(e) => setPerplexityApiKey(e.target.value)}
                placeholder="Enter your Perplexity API key"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="ml-2"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              Required for the Research Assistant feature. Get your API key from{" "}
              <a
                href="https://www.perplexity.ai/settings/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Perplexity API Settings
              </a>
            </p>
          </div>
          <Button onClick={saveApiKey} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save API Key"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileAPISettings;
