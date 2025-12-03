
export type View = 'dashboard' | 'tickets' | 'clients' | 'documents' | 'maintenance' | 'catalog';

export enum TicketStatus {
    New = 'Nuevo',
    InProgress = 'En Progreso',
    Scheduled = 'Agendado',
    Closed = 'Cerrado'
}

export enum Priority {
    Low = 'Baja',
    Medium = 'Media',
    High = 'Alta'
}

export interface Client {
    id: string;
    name: string; // Razón Social
    fantasyName?: string; // Nombre de Fantasía
    email: string;
    phone: string;
    secondaryPhone?: string;
    website?: string;
    
    // Address Details
    address?: string; // Calle y número
    country?: string;
    province?: string;
    city?: string;
    zipCode?: string;

    // Tax Details
    cuit?: string;
    taxCondition?: string; // IVA (Responsable Inscripto, etc.)

    notes?: string;
    createdAt: string;
}

export interface ModuleType {
    id: string;
    name: string;
    description: string;
    imageUrl?: string;
    createdAt: string;
}

export interface Module {
    id: string;
    clientId: string;
    moduleTypeId: string; // Link to the Catalog
    modelName: string; // Keep for easier display, but derived from Type
    serialNumber: string;
    installationDate: string;
    warrantyExpiration?: string;
    latitude?: number;
    longitude?: number;
    address?: string;
}

export interface Ticket {
    id: string;
    clientId: string;
    moduleId: string;
    title: string;
    description: string;
    status: TicketStatus;
    priority: Priority;
    createdAt: string;
    photos: string[];
    scheduledDate?: string;
    clientName?: string;
    moduleSerial?: string;
    latitude?: number;
    longitude?: number;
}

export interface Document {
    id: string;
    moduleId?: string; // Optional: Linked to specific installed instance
    moduleTypeId?: string; // Optional: Linked to the generic Model Type
    clientId?: string; // Optional: Linked directly to client (contracts, etc)
    name: string;
    type: 'manual' | 'warranty' | 'plan' | 'contract' | 'other';
    version?: string; // Only for 'plan' or generic docs
    url: string;
    uploadedAt: string;
}
