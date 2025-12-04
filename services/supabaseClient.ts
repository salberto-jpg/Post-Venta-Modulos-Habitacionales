import { createClient } from '@supabase/supabase-js';

// TODO: REEMPLAZA ESTAS CADENAS CON TUS CLAVES DE SUPABASE
// Las puedes encontrar en: Project Settings -> API
const SUPABASE_URL = 'https://jcolxnajpboiyzlremau.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_HlI2x5ryYkWpzzAyUQMGUw_S3_7PlQF'; 

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);