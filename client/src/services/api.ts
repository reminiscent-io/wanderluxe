
export const api = {
  get: async (url: string) => {
    try {
      const response = await fetch(`http://0.0.0.0:8080${url}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/auth';
          throw new Error('Unauthorized');
        }
        if (response.status >= 500) {
          throw new Error(`${response.status}: ${response.statusText}`);
        }
        throw new Error(`${response.status}: ${await response.text()}`);
      }

      return response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  post: async (url: string, data?: any) => {
    try {
      const response = await fetch(`http://0.0.0.0:8080${url}`, {
        method: "POST",
        headers: data ? { "Content-Type": "application/json" } : undefined,
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/auth';
          throw new Error('Unauthorized');
        }
        if (response.status >= 500) {
          throw new Error(`${response.status}: ${response.statusText}`);
        }
        throw new Error(`${response.status}: ${await response.text()}`);
      }

      return response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  upload: async (url: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`http://0.0.0.0:8080${url}`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/auth';
          throw new Error('Unauthorized');
        }
        if (response.status >= 500) {
          throw new Error(`${response.status}: ${response.statusText}`);
        }
        throw new Error(`${response.status}: ${await response.text()}`);
      }

      return response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
};
