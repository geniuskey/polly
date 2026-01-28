import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider, useAuth } from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from './lib/api';
import App from './App';
import './index.css';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  console.warn(
    'VITE_CLERK_PUBLISHABLE_KEY is not set. Auth features will not work.',
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
    },
  },
});

const ClerkTokenSync = () => {
  const { getToken } = useAuth();
  apiClient.setTokenGetter(getToken);
  return null;
};

const RootApp = () => {
  if (!CLERK_PUBLISHABLE_KEY) {
    return (
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
      <ClerkTokenSync />
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ClerkProvider>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
);
