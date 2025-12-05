import { GOOGLE_CALENDAR_SCOPES } from '../config';

declare global {
    interface Window {
        google: any;
    }
}

let tokenClient: any;
// Intentamos recuperar el token del almacenamiento local al inicio
let accessToken: string | null = localStorage.getItem('google_access_token');
let onTokenCallback: ((token: string) => void) | null = null;

// Helper para obtener claves dinámicas
export const getApiConfig = () => {
    const storedClientId = localStorage.getItem('google_client_id');
    const storedApiKey = localStorage.getItem('google_api_key');
    return {
        clientId: storedClientId || '',
        apiKey: storedApiKey || ''
    };
};

export const saveApiConfig = (clientId: string, apiKey: string) => {
    localStorage.setItem('google_client_id', clientId.trim());
    localStorage.setItem('google_api_key', apiKey.trim());
};

export const hasValidConfig = () => {
    const { clientId, apiKey } = getApiConfig();
    return clientId.length > 10 && apiKey.length > 10 && !clientId.includes('PON_AQUI');
};

export const initGoogleClient = (onTokenReceived: (token: string) => void) => {
    onTokenCallback = onTokenReceived;
    const { clientId } = getApiConfig();

    if (!hasValidConfig()) {
        console.warn("⚠️ Google API no configurada. Usando modo inactivo.");
        return;
    }

    // Si ya tenemos un token guardado, notificamos inmediatamente para restaurar la sesión
    if (accessToken && onTokenCallback) {
        onTokenCallback(accessToken);
    }

    if (typeof window !== 'undefined' && window.google && window.google.accounts) {
        try {
            // Inicializar el cliente de token
            tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: GOOGLE_CALENDAR_SCOPES,
                ux_mode: 'popup',
                callback: (tokenResponse: any) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        accessToken = tokenResponse.access_token;
                        // GUARDAR TOKEN EN LOCALSTORAGE PARA PERSISTENCIA
                        localStorage.setItem('google_access_token', accessToken as string);
                        
                        if (onTokenCallback) onTokenCallback(accessToken as string);
                    } else {
                        console.error("Respuesta de token vacía o error:", tokenResponse);
                    }
                },
                error_callback: (error: any) => {
                    console.error("Error en Google Auth:", error);
                    if (error.type === 'popup_closed') {
                         console.warn("Popup cerrado por el usuario");
                    } else {
                         alert(`Error de autenticación Google (${error.type}): ${error.message || 'Desconocido'}`);
                    }
                }
            });
            console.log("Google Token Client inicializado correctamente.");
        } catch (e) {
            console.error("Error inicializando Google Client:", e);
        }
    } else {
        console.warn("Librería Google GIS no cargada aún.");
    }
};

export const loginToGoogle = () => {
    if (!hasValidConfig()) {
        alert("Por favor, configura las credenciales de Google API primero (icono de engranaje).");
        return;
    }

    // Si ya tenemos token, no hace falta login (aunque initTokenClient maneja re-auth si es necesario)
    // Pero forzamos para renovar si el usuario hace clic explícitamente.
    
    // Check script loaded
    if (!window.google || !window.google.accounts) {
        alert("La librería de seguridad de Google no se ha cargado. Verifica si tienes bloqueadores de anuncios activados o recarga la página.");
        return;
    }

    if (!tokenClient) {
        // Reintentar init si falló antes
         const { clientId } = getApiConfig();
         if(clientId) {
            initGoogleClient(onTokenCallback || ((t) => {}));
         }
    }

    // Ejecución inmediata
    if (tokenClient) {
        tokenClient.requestAccessToken({ prompt: '' }); // '' para intentar login silencioso si es posible, o 'consent' para forzar
    } else {
        alert("No se pudo iniciar el cliente de autenticación. Verifica la configuración.");
    }
};

export const logoutFromGoogle = () => {
    if (accessToken && window.google) {
        window.google.accounts.oauth2.revoke(accessToken, () => {
            console.log('Access token revoked');
        });
    }
    accessToken = null;
    localStorage.removeItem('google_access_token'); // Limpiar almacenamiento
};

export const getGoogleUserProfile = async () => {
    if (!accessToken) return null;

    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (response.status === 401) {
             accessToken = null;
             localStorage.removeItem('google_access_token'); // Token expirado
             return null;
        }
        if (!response.ok) throw new Error('Failed to fetch user profile');
        return await response.json();
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
};

export interface GoogleCalendarEvent {
    id: string;
    summary: string;
    description?: string;
    location?: string;
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
    htmlLink: string;
}

// NUEVA FUNCIÓN: Crear evento en Google Calendar
export const createGoogleCalendarEvent = async (eventData: { title: string, description: string, date: string, location?: string }) => {
    if (!accessToken) {
        console.warn("No hay sesión de Google activa para crear el evento.");
        return false;
    }

    const { apiKey } = getApiConfig();
    
    // Calcular fecha fin (Google requiere fecha exclusiva para eventos de todo el día, es decir, día siguiente)
    const startDate = new Date(eventData.date);
    const endDate = new Date(eventData.date);
    endDate.setDate(endDate.getDate() + 1);
    const endDateString = endDate.toISOString().split('T')[0];

    const body = {
        summary: `Visita Técnica: ${eventData.title}`,
        description: eventData.description,
        location: eventData.location || '',
        start: {
            date: eventData.date // YYYY-MM-DD
        },
        end: {
            date: endDateString // YYYY-MM-DD (Día siguiente)
        }
    };

    try {
        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            }
        );

        if (!response.ok) {
            const error = await response.json();
            console.error("Error creando evento en Google:", error);
            if (response.status === 401) {
                accessToken = null;
                localStorage.removeItem('google_access_token');
            }
            throw new Error(error.error?.message || 'Error al crear evento en Google Calendar');
        }

        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
};

export const fetchGoogleEvents = async (): Promise<GoogleCalendarEvent[]> => {
    if (!accessToken) throw new Error("No access token");
    
    const { apiKey } = getApiConfig();
    if (!apiKey) throw new Error("No API Key configured");

    const now = new Date();
    const startRange = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    
    try {
        const calendarId = 'primary';
        
        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?key=${apiKey}&timeMin=${startRange}&showDeleted=false&singleEvents=true&maxResults=250&orderBy=startTime`,
            { 
                headers: { 
                    'Authorization': `Bearer ${accessToken}`, 
                    'Content-Type': 'application/json' 
                } 
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            const errorMessage = errorData.error?.message || 'Error desconocido';
            
            if (response.status === 401) {
                accessToken = null;
                localStorage.removeItem('google_access_token');
                throw new Error("TOKEN_EXPIRED");
            }

            if (response.status === 403) {
                if (errorMessage.toLowerCase().includes("not enabled")) {
                     throw new Error("API_NO_HABILITADA");
                }
                throw new Error(`PERMISO_DENEGADO (403): ${errorMessage}`);
            }

            throw new Error(`Error API Google (${response.status}): ${errorMessage}`);
        }

        const data = await response.json();
        return data.items || [];
    } catch (error) {
        throw error;
    }
};