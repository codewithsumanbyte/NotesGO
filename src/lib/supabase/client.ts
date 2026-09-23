import { createBrowserClient } from '@supabase/ssr';

const DEFAULT_SUPABASE_URL = 'https://dqugqxhurfwzxdkevuro.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxdWdxeGh1cmZ3enhka2V2dXJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwOTU2MDEsImV4cCI6MjEwNTY3MTYwMX0.6KRHl0Mx2qOZ0d2fGh0Vh2MQwjY-Zk5pTQIfFi-j7cQ';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  return createBrowserClient(url, key);
}
