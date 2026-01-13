import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://msgzbvqwaxxfrjmvoxgp.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zZ3pidnF3YXh4ZnJqbXZveGdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNjQ4ODUsImV4cCI6MjA4MzY0MDg4NX0.WTQ8-qC47q4AoBBkarpwv0EOELgYXF01CEwU7TW-Wss";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
