
let isLoading = false;
let isLoaded = false;

export const loadGoogleMapsApi = async () => {
  if (isLoaded) return;
  if (isLoading) {
    return new Promise(resolve => {
      const checkLoaded = setInterval(() => {
        if (isLoaded) {
          clearInterval(checkLoaded);
          resolve(true);
        }
      }, 100);
    });
  }

  isLoading = true;
  try {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        isLoaded = true;
        isLoading = false;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  } catch (error) {
    isLoading = false;
    throw error;
  }
};
