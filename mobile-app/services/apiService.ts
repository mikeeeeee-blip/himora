import axios from 'axios';
import authService from './authService';

// Create axios instance with default config
// Note: No baseURL since API_ENDPOINTS already contain full URLs (matching client structure)
const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
// Note: Client uses 'x-auth-token' header, not 'Authorization: Bearer'
apiClient.interceptors.request.use(
  async (config) => {
    // Ensure auth is loaded before getting token
    await authService.ensureAuthLoaded();
    const token = await authService.getToken();
    
    if (token) {
      // Use x-auth-token header to match client implementation
      config.headers['x-auth-token'] = token;
    } else {
      // If no token and this is not a public endpoint, reject the request
      // Public endpoints: login, signup, webhooks
      const publicEndpoints = ['/auth/login', '/auth/signup', '/webhook'];
      const isPublicEndpoint = publicEndpoints.some(endpoint => 
        config.url?.includes(endpoint)
      );
      
      if (!isPublicEndpoint) {
        console.warn('API Request without token to protected endpoint:', config.url);
        // Don't make the request, let the component handle the redirect
        return Promise.reject(new Error('No authentication token found'));
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - logout user
      await authService.logout();
      // You can navigate to login here if needed
    }
    return Promise.reject(error);
  }
);

export default apiClient;

