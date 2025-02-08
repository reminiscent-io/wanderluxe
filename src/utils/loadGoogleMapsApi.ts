export const loadGoogleMapsApi = async () => {
  if (window.google?.maps) {
    return Promise.resolve();
  }
  try {
    const { data: { key }, error } = await supabase.functions.invoke('get-google-places-key');

    if (error || !key) {
      throw new Error('Failed to fetch Google Places API key');
    }

    return new Promise<void>((resolve, reject) => {
      if (window.google?.maps) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Maps API'));
      document.head.appendChild(script);
    });
  } catch (error) {
    console.error('Error loading Google Maps API:', error);
    throw error;
  }
};