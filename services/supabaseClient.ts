import { createClient } from '@supabase/supabase-js';

// Claves configuradas desde tu entorno
const SUPABASE_URL = 'https://jcolxnajpboiyzlremau.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_HlI2x5ryYkWpzzAyUQMGUw_S3_7PlQF'; // Asegúrate que esta sea tu ANON KEY real (empieza con eyJ...)

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);