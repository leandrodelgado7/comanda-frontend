// DESARROLLO - Archivo de entorno para desarrollo
const API_BASE_URL = 'http://localhost:8080';
const VOICE_API_BASE_URL = 'http://localhost:8000';

export const environment = {
  apiBaseUrl: API_BASE_URL,
  voiceApiBaseUrl: VOICE_API_BASE_URL,
  transcribeApiUrl: `${VOICE_API_BASE_URL}/transcribe`,
  retryApiUrl: `${VOICE_API_BASE_URL}/retry`,
  taxPercentage: 21,
  productsApiUrl: `${API_BASE_URL}/api/products`,
  categoriesApiUrl: `${API_BASE_URL}/api/categories`,
  ordersApiUrl: `${API_BASE_URL}/api/orders`,
  username: 'admin',
  password: 'admin123'
};
