export const api = {
  get: async (url: string) => {
    const response = await fetch(`http://0.0.0.0:5000${url}`, {
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status >= 500) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      throw new Error(`${response.status}: ${await response.text()}`);
    }

    return response.json();
  },

  post: async (url: string, data?: any) => {
    const response = await fetch(`http://0.0.0.0:5000${url}`, {
      method: "POST",
      headers: data ? { "Content-Type": "application/json" } : undefined,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status >= 500) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      throw new Error(`${response.status}: ${await response.text()}`);
    }

    return response.json();
  },

  upload: async (url: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`http://0.0.0.0:5000${url}`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status >= 500) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      throw new Error(`${response.status}: ${await response.text()}`);
    }

    return response.json();
  },
};