
// This is a mock implementation for the frontend
// In a real application, this would be a server-side function to protect your API key

export async function fetchUnsplashImages(query: string) {
  // Simulating a delay for the API call
  await new Promise(resolve => setTimeout(resolve, 500));
  
  if (!query || query.trim().length < 2) {
    return { images: [] };
  }
  
  // In a real implementation, this would call the Unsplash API with your API key
  // For demo purposes, we're returning mock data with more realistic photographer details
  
  const mockPhotographers = [
    { name: "John Smith", username: "johnsmith" },
    { name: "Emily Johnson", username: "emilyjphoto" },
    { name: "Michael Brown", username: "mikebrown" },
    { name: "Sarah Davis", username: "sarahdavis" },
    { name: "Alex Wong", username: "alexwongphoto" }
  ];
  
  return {
    images: Array(4).fill(null).map((_, index) => {
      const randomPhotographer = mockPhotographers[Math.floor(Math.random() * mockPhotographers.length)];
      
      return {
        id: `mock-image-${index + 1}`,
        url: `https://source.unsplash.com/random/800x600/?${encodeURIComponent(query)},${index + 1}`,
        description: `A ${query} scene captured in beautiful light`,
        photographer: randomPhotographer.name,
        unsplashUsername: randomPhotographer.username
      };
    })
  };
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const query = url.searchParams.get('query');
  
  if (!query) {
    return new Response(JSON.stringify({ error: 'Query parameter is required' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  
  try {
    const result = await fetchUnsplashImages(query);
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in Unsplash search API:', error);
    
    return new Response(JSON.stringify({ error: 'Failed to fetch images' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
