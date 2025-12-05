
// CONFIGURACIÓN DE GOOGLE CALENDAR
// ---------------------------------
// NOTA: Estas constantes actúan ahora como valores por defecto.
// La aplicación permite ingresar estas claves dinámicamente desde la interfaz (icono de engranaje en Agenda),
// guardándolas en localStorage del navegador.
//
// Para obtener estas claves:
// 1. Ve a https://console.cloud.google.com/
// 2. Crea un proyecto y ve a "APIs y Servicios" -> "Credenciales".
// 3. Crea una "API Key" (Clave de API).
// 4. Crea un "ID de cliente de OAuth 2.0" (Aplicación Web).
// 5. IMPORTANTE: En "Orígenes autorizados de JavaScript", debes poner la URL exacta de tu app.

export const GOOGLE_CLIENT_ID = 'PON_AQUI_TU_CLIENT_ID.apps.googleusercontent.com';
export const GOOGLE_API_KEY = 'PON_AQUI_TU_API_KEY';

// Permisos: Calendario (lectura y escritura) y Perfil (para mostrar foto y nombre)
// SE HA CAMBIADO 'calendar.readonly' POR 'calendar' PARA PERMITIR AGENDAR
export const GOOGLE_CALENDAR_SCOPES = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.profile';
