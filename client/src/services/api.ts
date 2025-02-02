
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.DEV ? 'http://0.0.0.0:8080/api' : '/api',
  withCredentials: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/json'
  }
});

export const api = {
  get: async (url: string) => {
    try {
      const response = await axiosInstance.get(url);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          const authUrl = '/auth';
          if (window.location.pathname !== authUrl) {
            window.location.assign(authUrl);
          }
          throw new Error('Unauthorized');
        }
        throw new Error(`${error.response?.status}: ${error.response?.data}`);
      }
      throw error;
    }
  },

  post: async (url: string, data?: any) => {
    try {
      const response = await axiosInstance.post(url, data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          const authUrl = '/auth';
          if (window.location.pathname !== authUrl) {
            window.location.assign(authUrl);
          }
          throw new Error('Unauthorized');
        }
        throw new Error(`${error.response?.status}: ${error.response?.data}`);
      }
      throw error;
    }
  },

  upload: async (url: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await axiosInstance.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          const authUrl = '/auth';
          if (window.location.pathname !== authUrl) {
            window.location.assign(authUrl);
          }
          throw new Error('Unauthorized');
        }
        throw new Error(`${error.response?.status}: ${error.response?.data}`);
      }
      throw error;
    }
  }
};
