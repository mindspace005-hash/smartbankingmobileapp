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
};

// Keep JWT token strictly in memory (persisted encrypted via Keychain, never in plaintext AsyncStorage)
let inMemoryAuthToken = '';
let onUnauthorizedCallback: (() => void) | null = null;
let isHandlingUnauthorized = false;

export const setInMemoryAuthToken = (token: string) => {
  inMemoryAuthToken = token || '';
  if (token) {
    isHandlingUnauthorized = false;
  }
};

export const getInMemoryAuthToken = (): string => inMemoryAuthToken;

export const registerUnauthorizedHandler = (handler: (() => void) | null) => {
  onUnauthorizedCallback = handler;
};

export const apiClient = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach in-memory JWT token and Agent ID if present
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const agentId = await AsyncStorage.getItem('AGENT_ID');
      if (inMemoryAuthToken && config.headers) {
        config.headers.Authorization = `Bearer ${inMemoryAuthToken}`;
      }
      if (agentId && config.headers) {
        config.headers['X-Agent-Id'] = agentId;
      }
    } catch (error) {
      console.error('Error attaching auth headers', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Unauthorized globally and trigger logout
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const reqUrl: string = error?.config?.url || '';
    const lowerUrl = reqUrl.toLowerCase();
    const isLoginCall =
      lowerUrl.includes('/api/auth/login') ||
      lowerUrl.includes('/api/auth/customer/activate-temp-pin');
    if (error.response && error.response.status === 401 && !isLoginCall && inMemoryAuthToken) {
      console.warn('401 Unauthorized - clearing session and returning to login');
      inMemoryAuthToken = '';
      if (onUnauthorizedCallback && !isHandlingUnauthorized) {
        isHandlingUnauthorized = true;
        try {
          onUnauthorizedCallback();
        } catch (e) {
          console.error('Error during unauthorized logout callback', e);
        }
      }
    }
    return Promise.reject(error);
  }
);
