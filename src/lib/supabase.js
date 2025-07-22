// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zkufbcvorhoyfafukeom.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprdWZiY3ZvcmhveWZhZnVrZW9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3Nzg0NTQsImV4cCI6MjA2NTM1NDQ1NH0.-Uyftp73gVjWWFy7FmZpwEUkbJtUMaF8I5TQtsvGAPU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
