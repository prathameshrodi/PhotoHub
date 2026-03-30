import axios from 'axios';

export const API_BASE_URL = `${window.location.origin}/api/v1`;

const api = axios.create({
    baseURL: API_BASE_URL,
});




// Request interceptor to add token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle 401
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Clear token and redirect to login
            localStorage.removeItem('token');
            // Only redirect if not already there to prevent loops
            if (!window.location.pathname.includes('/login')) {
                 window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export const triggerScan = async () => {
    return api.post('/scan');
};

export default api;
