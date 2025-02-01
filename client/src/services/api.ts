
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest'
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
          window.location.href = '/auth';
          throw new Error('Unauthorized');
        }
        if (error.response?.status && error.response.status >= 500) {
          throw new Error(`${error.response.status}: ${error.response.statusText}`);
        }
        throw new Error(`${error.response?.status}: ${error.response?.data}`);
      }
      console.error('API Error:', error);
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
          window.location.href = '/auth';
          throw new Error('Unauthorized');
        }
        if (error.response?.status && error.response.status >= 500) {
          throw new Error(`${error.response.status}: ${error.response.statusText}`);
        }
        throw new Error(`${error.response?.status}: ${error.response?.data}`);
      }
      console.error('API Error:', error);
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
          window.location.href = '/auth';
          throw new Error('Unauthorized');
        }
        if (error.response?.status && error.response.status >= 500) {
          throw new Error(`${error.response.status}: ${error.response.statusText}`);
        }
        throw new Error(`${error.response?.status}: ${error.response?.data}`);
      }
      console.error('API Error:', error);
      throw error;
    }
  }
};
