import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  try {
    // Using the Unsplash API directly
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=10`,
      {
        headers: {
          'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY || 'YOUR_UNSPLASH_ACCESS_KEY'}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Unsplash API responded with ${response.status}`);
    }

    const data = await response.json();

    // Format the response to include attribution data
    const formattedImages = data.results.map(image => ({
      url: image.urls.regular,
      photographer: image.user.name,
      unsplashUsername: image.user.username
    }));

    return res.status(200).json(formattedImages);
  } catch (error) {
    console.error('Error fetching images from Unsplash:', error);
    return res.status(500).json({ error: 'Failed to fetch images' });
  }
}