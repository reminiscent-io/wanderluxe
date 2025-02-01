
import express from 'express';
import { Request, Response } from "express";
import { requireAuth, requireTripAccess } from "../middleware/auth.middleware";

const router = express.Router();

router.post('/', requireAuth, requireTripAccess("viewer"), async (req: Request, res: Response) => {
  try {
    const { tripId, message, model } = req.body;
    
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
            content: `You are a luxury travel assistant. Help plan a trip with ID ${tripId}. 
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

    const data = await response.json();
    res.json({
      content: data.choices[0].message.content,
      tripId,
      sources: data.sources
    });

  } catch (error) {
    console.error('Perplexity API error:', error);
    res.status(500).json({ error: "Failed to get AI response" });
  }
});

export default router;
