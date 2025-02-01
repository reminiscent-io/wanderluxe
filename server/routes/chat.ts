// server/routes/chat.ts
import express from 'express';
import { Request, Response } from "express";
import { requireAuth, requireTripAccess } from "../middleware/auth.middleware";

const router = express.Router();

router.post('/', 
  requireAuth, 
  requireTripAccess("viewer"), 
  async (req: Request, res: Response) => {
    try {
      const { tripId, message, model } = req.body;

      // Validation check
      if (!tripId || !message) {
        return res.status(400).json({ 
          error: "Missing required fields: tripId or message" 
        });
      }

      // Perplexity API call
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`
        },
        body: JSON.stringify({
          model: model || "sonar-pro",
          messages: [
            {
              role: "system",
              content: `You are a luxury travel assistant. Help plan trip ID ${tripId}.
                        Focus on high-end experiences, exclusive locations, and personalized service.
                        Consider budget, timeline, and user preferences.`
            },
            {
              role: "user",
              content: message
            }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Perplexity API error:', errorText);
        return res.status(500).json({ 
          error: "Failed to get AI response",
          details: errorText
        });
      }

      const data = await response.json();

      res.json({
        content: data.choices[0]?.message?.content || "No response from AI",
        tripId,
        sources: data.sources || []
      });

    } catch (error) {
      console.error('Server error:', error);
      res.status(500).json({ 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
);

export default router;
