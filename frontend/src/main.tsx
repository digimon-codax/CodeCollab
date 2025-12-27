import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import './index.css';
import App from './App';

// Setup Axios default base URL
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
axios.defaults.withCredentials = true;

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </QueryClientProvider>
    </React.StrictMode>
);
