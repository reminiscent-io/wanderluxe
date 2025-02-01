
import express from 'express';
import { Request, Response } from "express";
import { requireAuth, requireTripAccess } from "../middleware/auth.middleware";
import cors from 'cors';

const router = express.Router();

// Configure CORS for the chat route
router.use(cors({
  origin: [
    'https://*.replit.dev',
    'http://localhost:5173'
  ],
  credentials: true
}));

router.get('/', requireAuth, (req, res) => {
  res.json({ status: 'Chat service is running' });
});

router.post('/', requireAuth, requireTripAccess("viewer"), async (req: Request, res: Response) => {
  try {
    const { tripId, message, model } = req.body;

    if (!tripId || !message) {
      return res.status(400).json({ error: "Missing required fields: tripId or message" });
    }

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

    if (!response.ok) {
      console.error('Perplexity API error:', await response.text());
      return res.status(500).json({ error: "Failed to get AI response" });
    }

    const data = await response.json();
    res.json({
      content: data.choices[0]?.message?.content || "No response from AI",
      tripId,
      sources: data.sources || []
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
