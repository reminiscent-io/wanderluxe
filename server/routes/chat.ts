import express from 'express';
import { Request, Response } from "express";
import cors from 'cors';

const router = express.Router();

// Basic CORS setup
router.use(cors());

// Health check endpoint
router.get('/', (req, res) => {
  res.json({ status: 'Chat service is running', timestamp: new Date().toISOString() });
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { messages, model } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ 
        error: "Missing or invalid messages array" 
      });
    }

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'X-Request-ID': crypto.randomUUID(),
        'X-Client-Version': process.env.npm_package_version || '1.0.0'
      },
      body: JSON.stringify({
        model: model || "llama-3.1-sonar-small-128k-online",
        messages,
        temperature: 0.2,
        max_tokens: 1000
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
      choices: data.choices,
      citations: data.citations || []
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;
