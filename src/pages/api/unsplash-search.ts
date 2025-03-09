
// This is a mock implementation for the frontend
// In a real application, this would be a server-side function to protect your API key

export async function fetchUnsplashImages(query: string) {
  // In a real implementation, this would call the Unsplash API with your API key
  // For demo purposes, we're returning mock data
  
  return {
    images: [
      {
        id: 'mock-image-1',
        url: 'https://source.unsplash.com/random/800x600/?' + encodeURIComponent(query) + ',1',
        description: 'A beautiful ' + query + ' image',
        photographer: 'Unsplash Photographer',
        unsplashUsername: 'unsplash'
      },
      {
        id: 'mock-image-2',
        url: 'https://source.unsplash.com/random/800x600/?' + encodeURIComponent(query) + ',2',
        description: 'Another ' + query + ' image',
        photographer: 'Unsplash Photographer',
        unsplashUsername: 'unsplash'
      },
      {
        id: 'mock-image-3',
        url: 'https://source.unsplash.com/random/800x600/?' + encodeURIComponent(query) + ',3',
        description: 'A scenic ' + query + ' view',
        photographer: 'Unsplash Photographer',
        unsplashUsername: 'unsplash'
      },
      {
        id: 'mock-image-4',
        url: 'https://source.unsplash.com/random/800x600/?' + encodeURIComponent(query) + ',4',
        description: query + ' landscape',
        photographer: 'Unsplash Photographer',
        unsplashUsername: 'unsplash'
      }
    ]
  };
}
