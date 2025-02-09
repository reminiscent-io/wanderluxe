
let isLoaded = false;

export const loadGoogleMapsApi = async (): Promise<void> => {
  if (isLoaded) return;

  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
  script.async = true;
  script.defer = true;
  
  const loadPromise = new Promise<void>((resolve, reject) => {
    script.onload = () => {
      isLoaded = true;
      resolve();
    };
    script.onerror = reject;
  });

  document.head.appendChild(script);
  await loadPromise;
};
