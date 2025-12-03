
// PLEASE NOTE: In a real-world application, these values should be stored in
// environment variables and not be hardcoded.

// --- MODO DE DEMOSTRACIÓN ---
// En este prototipo, la conexión con Google Calendar está simulada y no se utilizan estas claves.
// Para la versión final, DEBES reemplazar estos valores con tus credenciales reales de Google Cloud.
// La falta de claves reales en producción causará errores de conexión (Error 400).
//
// Instrucciones para obtener Client ID: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid
export const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

// Instrucciones para obtener API Key (habilita "Google Calendar API" y "Maps Embed API"): https://developers.google.com/workspace/guides/create-credentials
export const GOOGLE_API_KEY = 'YOUR_GOOGLE_API_KEY';

// The scope for Google Calendar API.
export const GOOGLE_CALENDAR_SCOPES = 'https://www.googleapis.com/auth/calendar';