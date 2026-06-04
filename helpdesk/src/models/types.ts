
export interface ITicket {
    Id: number;
    Title: string;
    Status: string;
    Statut?: string;
    status?: string;
    Created: string;
    Modified: string;
    Author: {
        Id: number;
        Title: string;
    };
    Editor?: {
        Title: string;
    };
    Reference: string;
    Categorie: string;
    Priorite: string;
    Description: string;
    AssignedTo?: {
        Id: number;
        Title: string;
    };
    AssignedToId?: number;
    CreeparId?: number;
    DueDate: string;
}

export interface IUserListItem {
    Id: number;
    role?: string;
    Role?: string;
    status?: string;
    Status?: string;
    Department?: string;
    JobTitle?: string;
    Specialization?: string;
    PhoneNumber?: string;
    user?: {
        Id: number;
        Title: string;
    };
}

export interface IComment {
    Id: number;
    Text: string;
    Commentaire: string;
    Created: string;
    Author: {
        Title: string;
    };
}

export interface IAgentStats {
    totalAssigned: number;
    open: number;
    resolved: number;
}
