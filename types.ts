
export type View = 'dashboard' | 'tickets' | 'clients' | 'documents' | 'maintenance' | 'catalog' | 'users';

export enum TicketStatus {
    New = 'Nuevo',
    Scheduled = 'Agendado',
    Closed = 'Cerrado'
}

export enum Priority {
    Low = 'Baja',
    Medium = 'Media',
    High = 'Alta'
}

export type UserRole = 'admin' | 'user';

export interface UserProfile {
    id: string;
    email: string;
    role: UserRole;
    name?: string;
    mustChangePassword?: boolean; // New field
}

export interface Client {
    id: string;
    name: string; 
    fantasyName?: string; 
    email: string;
    phone: string;
    secondaryPhone?: string;
    website?: string;
    
    address?: string; 
    country?: string;
    province?: string;
    city?: string;
    zipCode?: string;

    cuit?: string;
    taxCondition?: string; 

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
    moduleTypeId: string; 
    modelName: string; 
    serialNumber: string;
    installationDate: string; // Fecha técnica de instalación
    deliveryDate?: string;    // Fecha comercial de entrega (Inicio Garantía)
    warrantyExpiration?: string; // Fin de garantía calculado
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
    affectedPart?: string;
    createdAt: string;
    photos: string[];
    scheduledDate?: string;
    clientName?: string;
    moduleSerial?: string;
    latitude?: number;
    longitude?: number;
    address?: string;
    
    // New fields for Voice Notes and Closure Logic
    audioUrl?: string;          // Audio created with the ticket
    closureDescription?: string; // What was done
    closurePhotos?: string[];    // Photos of the finished work
    closureAudioUrl?: string;    // Audio note explaining the closure
    
    // Warranty & Billing
    invoiceUrl?: string; // Legacy: URL de la factura principal
    invoices?: string[]; // Lista de facturas o comprobantes
    warrantyExpiration?: string; // Fecha de vencimiento de garantía del módulo asociado (JOIN)
}

export interface Document {
    id: string;
    moduleId?: string; 
    moduleTypeId?: string; 
    clientId?: string; 
    name: string;
    type: 'manual' | 'warranty' | 'plan' | 'contract' | 'other';
    version?: string; 
    url: string;
    uploadedAt: string;
}
