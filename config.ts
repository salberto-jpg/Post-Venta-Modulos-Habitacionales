
// PLEASE NOTE: In a real-world application, these values should be stored in
// environment variables (e.g. import.meta.env.VITE_GOOGLE_CLIENT_ID) and not be hardcoded.

// --- CONFIGURACIÓN DE GOOGLE CALENDAR ---

// 1. CLIENT ID (OAuth): Necesario para pedir permiso al usuario y leer su calendario privado.
// Obtenlo en: https://console.cloud.google.com/apis/credentials
export const GOOGLE_CLIENT_ID = 'TU_CLIENT_ID_AQUI.apps.googleusercontent.com';

// 2. API KEY: Necesaria para usar la API de Google Maps Embed y Calendar.
// Obtenla en: https://console.cloud.google.com/apis/credentials
export const GOOGLE_API_KEY = 'TU_API_KEY_AQUI';

// Permisos que solicitaremos al usuario (Solo lectura de calendario para ver disponibilidad)
export const GOOGLE_CALENDAR_SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';
