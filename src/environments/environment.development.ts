// DESARROLLO - Archivo de entorno para desarrollo
const API_BASE_URL = 'http://localhost:8080';

export const environment = {
  apiBaseUrl: API_BASE_URL,
  // apiUrl: 'http://vps-2068649-x.dattaweb.com:8000/transcribe',
  apiUrl: 'http://localhost:8000/transcribe',
  productsApiUrl: `${API_BASE_URL}/api/products`,
  categoriesApiUrl: `${API_BASE_URL}/api/categories`,
  ordersApiUrl: `${API_BASE_URL}/api/orders`,
  username: 'admin',
  password: 'admin123'
};
