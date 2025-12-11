
import { GOOGLE_CALENDAR_SCOPES } from '../config';
import { type Ticket } from '../types';

declare global {
    interface Window {
        google: any;
    }
}

let tokenClient: any;
let accessToken: string | null = localStorage.getItem('google_access_token');
let tokenExpiration: number = parseInt(localStorage.getItem('google_token_expiration') || '0');

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

export const isTokenValid = () => {
    return accessToken && Date.now() < tokenExpiration;
};

export const initGoogleClient = (onTokenReceived: (token: string) => void) => {
    const { clientId } = getApiConfig();

    if (!hasValidConfig()) {
        console.warn("⚠️ Google API no configurada.");
        return;
    }

    // Si hay un token válido guardado, lo usamos inmediatamente
    if (isTokenValid() && accessToken) {
        console.log("Restaurando sesión de Google válida...");
        onTokenReceived(accessToken);
    }

    if (typeof window !== 'undefined' && window.google && window.google.accounts) {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: GOOGLE_CALENDAR_SCOPES,
            ux_mode: 'popup',
            callback: (tokenResponse: any) => {
                if (tokenResponse && tokenResponse.access_token) {
                    accessToken = tokenResponse.access_token;
                    // Token suele durar 3599 segundos. Guardamos expiración.
                    const expiresIn = (tokenResponse.expires_in || 3599) * 1000;
                    tokenExpiration = Date.now() + expiresIn;
                    
                    localStorage.setItem('google_access_token', accessToken as string);
                    localStorage.setItem('google_token_expiration', tokenExpiration.toString());
                    
                    if (onTokenCallback) onTokenCallback(accessToken as string);
                }
            },
        });
    }
    
    // Guardamos el callback globalmente para re-intentos
    onTokenCallback = onTokenReceived;
};

let onTokenCallback: ((token: string) => void) | null = null;

export const loginToGoogle = () => {
    if (!hasValidConfig()) {
        alert("Configura las credenciales API primero.");
        return;
    }
    if (tokenClient) {
        // CAMBIO IMPORTANTE: 'consent' fuerza a Google a mostrar la pantalla de permisos nuevamente.
        // Esto es necesario para actualizar de 'readonly' a permisos de escritura.
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        // Si el script no cargó, reintentamos init
        initGoogleClient(onTokenCallback || (() => {}));
    }
};

export const logoutFromGoogle = () => {
    if (accessToken && window.google) {
        window.google.accounts.oauth2.revoke(accessToken, () => {
            console.log('Access token revoked');
        });
    }
    accessToken = null;
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_token_expiration');
};

export const getGoogleUserProfile = async () => {
    if (!accessToken) return null;
    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (response.status === 401) return null; // Token expirado
        return await response.json();
    } catch (error) {
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

export const createGoogleCalendarEvent = async (eventData: { title: string, description: string, date: string, location?: string }) => {
    if (!accessToken) return false;

    // NOTA: No usamos '?key=' aquí. Con el token OAuth es suficiente.
    
    // Evento de día completo
    const startDate = new Date(eventData.date);
    const endDate = new Date(eventData.date);
    endDate.setDate(endDate.getDate() + 1);
    
    const body = {
        summary: `🛠️ ${eventData.title}`,
        description: eventData.description,
        location: eventData.location || '',
        start: { date: eventData.date },
        end: { date: endDate.toISOString().split('T')[0] },
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'email', minutes: 24 * 60 },
                { method: 'popup', minutes: 30 },
            ],
        },
    };

    try {
        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events`,
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
            const errJson = await response.json();
            console.error("Google Calendar API Error:", errJson);
            // Si es un error de permisos, devolvemos false para manejarlo en la UI
            if (response.status === 403) {
                 console.error("Permisos insuficientes. El usuario debe reconectar la cuenta.");
            }
            throw new Error('Error API Google: ' + (errJson.error?.message || response.statusText));
        }
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
};

export const fetchGoogleEvents = async (): Promise<GoogleCalendarEvent[]> => {
    if (!accessToken) throw new Error("No token");
    
    const now = new Date();
    const startRange = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    
    const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startRange}&showDeleted=false&singleEvents=true&maxResults=250&orderBy=startTime`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
        if (response.status === 401) {
            accessToken = null; // Forzar re-login en UI
            localStorage.removeItem('google_access_token');
            throw new Error("TOKEN_EXPIRED");
        }
        const errJson = await response.json();
        console.error("Google Fetch Error:", errJson);
        throw new Error("API Error: " + (errJson.error?.message || response.statusText));
    }

    const data = await response.json();
    return data.items || [];
};

// NUEVA FUNCIÓN: Buscar evento por título/fecha y marcar como COMPLETADO
export const findAndMarkEventAsDone = async (ticket: Ticket) => {
    if (!accessToken || !ticket.scheduledDate) return false;

    try {
        // 1. Definir rango de tiempo (El día agendado)
        const startDay = new Date(ticket.scheduledDate);
        const endDay = new Date(ticket.scheduledDate);
        endDay.setDate(endDay.getDate() + 1);

        const timeMin = startDay.toISOString();
        const timeMax = endDay.toISOString();

        // 2. Construir título esperado
        const expectedTitle = `${ticket.title} - ${ticket.clientName}`;

        // 3. Buscar eventos ese día
        // Usamos 'q' para filtrar por texto libre y reducir resultados
        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&q=${encodeURIComponent(ticket.title)}&singleEvents=true`,
            { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );

        if (!response.ok) return false;
        
        const data = await response.json();
        const events: GoogleCalendarEvent[] = data.items || [];

        // 4. Encontrar el evento que coincida mejor
        // Buscamos algo que contenga el título del ticket O el formato completo que generamos
        const targetEvent = events.find(e => 
            e.summary.includes(ticket.title) && 
            e.summary.includes(ticket.clientName || '') &&
            !e.summary.includes('✔') // Evitar re-procesar
        );

        if (targetEvent) {
            // 5. PATCH para actualizar:
            // - Agregar Check al título
            // - Cambiar colorId a '8' (Graphite/Gris) para indicar finalizado
            const newTitle = `✔ [REALIZADO] ${targetEvent.summary.replace('🛠️ ', '')}`;
            
            const patchBody = {
                summary: newTitle,
                colorId: '8', // 8 = Graphite (Gris Oscuro), visualmente "apagado"
                description: `--- ✅ SERVICIO COMPLETADO EL ${new Date().toLocaleDateString()} ---\n\n${targetEvent.description || ''}`
            };

            await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events/${targetEvent.id}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(patchBody)
                }
            );
            return true;
        }

    } catch (e) {
        console.error("Error updating Google Calendar event:", e);
    }
    return false;
};

// --- DEMO MODE UTILS ---
export const getMockGoogleEvents = (): GoogleCalendarEvent[] => {
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 3);

    const toDateString = (date: Date) => date.toISOString().split('T')[0];

    return [
        {
            id: 'mock-1', summary: 'Reunión de Equipo', htmlLink: '#',
            start: { dateTime: `${toDateString(today)}T09:00:00` }, end: { dateTime: `${toDateString(today)}T10:30:00` }
        },
        {
            id: 'mock-2', summary: 'Almuerzo con Cliente', htmlLink: '#',
            start: { dateTime: `${toDateString(today)}T13:00:00` }, end: { dateTime: `${toDateString(today)}T14:00:00` }
        },
        {
            id: 'mock-3', summary: 'Visita Técnica: Green Box #44', htmlLink: '#',
            start: { date: toDateString(yesterday) }, end: { date: toDateString(yesterday) }
        },
        {
            id: 'mock-4', summary: 'Entrega de Materiales', htmlLink: '#',
            start: { dateTime: `${toDateString(tomorrow)}T11:00:00` }, end: { dateTime: `${toDateString(tomorrow)}T12:00:00` }
        },
        {
            id: 'mock-5', summary: 'Mantenimiento Preventivo (Externo)', htmlLink: '#',
            start: { date: toDateString(nextWeek) }, end: { date: toDateString(nextWeek) }
        }
    ];
};
