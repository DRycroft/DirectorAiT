import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "https://lomksomekpysjgtnlguq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvbWtzb21la3B5c2pndG5sZ3VxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NjEyMDgsImV4cCI6MjA3NjMzNzIwOH0.xwRiW2B8X51puDJ3IxnwKWsUsv7jRHsAIJjd6Wkq-JA";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
