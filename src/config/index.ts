import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Sanstha Registry: Define all supported client environments here
export const SANSTHA_REGISTRY = {
  TESTING: {
    id: 'testing',
    name: 'SmartBanking Testing / Demo',
    apiUrl: 'https://api.testing.hellomindspace.in',
  },
  BAMBAVADE: {
    id: 'bambavade',
    name: 'Bambavade Urban Co-op Credit Society',
    apiUrl: 'https://api-bambavadeurban.hellomindspace.in',
  },
  PADVALWADI: {
    id: 'padvalwadi',
    name: 'Padvalwadi Urban Co-op Credit Society',
    apiUrl: 'https://api-padvalwadi.hellomindspace.in',
  },
} as const;

// Switch between sansthas easily by toggling this variable:
export const CURRENT_SANSTHA: keyof typeof SANSTHA_REGISTRY = 'TESTING';

export const CONFIG = {
  SANSTHA_NAME: SANSTHA_REGISTRY[CURRENT_SANSTHA].name,
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || SANSTHA_REGISTRY[CURRENT_SANSTHA].apiUrl,
  // You can set EXPO_PUBLIC_API_BASE_URL in your .env or environment to override this.
};

export const apiClient = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach token if it exists
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('AUTH_TOKEN');
      const agentId = await AsyncStorage.getItem('AGENT_ID');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      if (agentId && config.headers) {
        config.headers['X-Agent-Id'] = agentId;
      }
    } catch (error) {
      console.error('Error reading token from AsyncStorage', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle 401 Unauthorized globally
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      // Token is invalid or expired
      console.warn('401 Unauthorized - clearing token and redirecting to login');
      try {
        await AsyncStorage.removeItem('AUTH_TOKEN');
      } catch (e) {
        console.error('Error removing token on 401', e);
      }
      
      // Optionally trigger a global event here if needed, but context rehydration on token clear
      // might need to be handled carefully. We'll rely on the app checking token state or
      // returning the error to the caller who handles the logout.
      // Alternatively, we could dispatch a custom event.
    }
    return Promise.reject(error);
  }
);

