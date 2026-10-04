import { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { User, Config } from '../types';
export const SessionContext = createContext<{ user: User; config: Config } | null>(null);
export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('Session missing');
  return context;
}
export function useConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: () => api<Config>('/config'),
    staleTime: 60000,
    retry: 1,
  });
}
