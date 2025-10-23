import axios from 'axios';
import { API_ENDPOINTS, USER_ROLES } from '../constants/api';

class SignupService {
  async signup(userData) {
    try {
      console.log('Signing up user:', userData.email);
      console.log('Signup endpoint:', API_ENDPOINTS.SIGNUP);

      const response = await axios.post(API_ENDPOINTS.SIGNUP, userData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Signup response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Signup error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      // Handle specific error cases
      if (error.response?.status === 400) {
        throw new Error('Invalid signup data. Please check all fields.');
      } else if (error.response?.status === 409) {
        throw new Error('User already exists with this email address.');
      } else if (error.response?.status === 422) {
        throw new Error('Validation error. Please check your input data.');
      } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        throw new Error('Network error. Please check your connection and try again.');
      } else {
        throw new Error(error.response?.data?.message || error.message || 'Signup failed');
      }
    }
  }
}

export default new SignupService();
