"use client";
import { useState, type ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProvider } from '@/context/UserContext';
export default function Providers({ children }: { children: ReactNode }) {
 const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 300000, refetchOnWindowFocus: false } } }));
 return <SessionProvider><QueryClientProvider client={client}><UserProvider>{children}</UserProvider></QueryClientProvider></SessionProvider>;
}