import { WebPartContext } from "@microsoft/sp-webpart-base";
import { spfi, SPFI, SPFx } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import "@pnp/sp/site-users/web";
import "@pnp/sp/files";
import "@pnp/sp/folders";
import "@pnp/sp/attachments";

export class SPService {
    public _sp: SPFI;

    constructor(context: WebPartContext) {
        this._sp = spfi().using(SPFx(context));
    }

    public async createTicket(ticketDetails: any, attachment: File | null): Promise<void> {
        try {
            // Get current user to populate Creepar (Person column)
            const user = await this._sp.web.currentUser();
            
            const payload = {
                ...ticketDetails,
                CreeparId: user.Id
            };

            const result = await this._sp.web.lists.getByTitle("ticket").items.add(payload);

            if (attachment) {
                await result.item.attachmentFiles.add(attachment.name, attachment);
            }
        } catch (error) {
            console.error("Error creating ticket", error);
            throw error;
        }
    }

    public async getUserTickets(userId: number): Promise<any[]> {
        try {
            return await this._sp.web.lists.getByTitle("ticket").items
                .select("Id", "Title", "Status", "Created", "Author/Id", "Author/Title", "Reference", "Categorie", "Priorite", "Description")
                .expand("Author")
                .filter(`Author/Id eq ${userId}`)
                .orderBy("Created", false)();
        } catch (error) {
            console.error("Error fetching user tickets", error);
            throw error;
        }
    }

    public async getAllTickets(): Promise<any[]> {
        try {
            return await this._sp.web.lists.getByTitle("ticket").items
                .select("Id", "Title", "Status", "Created", "Author/Id", "Author/Title", "Reference", "Categorie", "Priorite", "Description", "AssignedTo/Id", "AssignedTo/Title")
                .expand("Author", "AssignedTo")
                .orderBy("Created", false)();
        } catch (error) {
            console.error("Error fetching all tickets", error);
            throw error;
        }
    }

    public async getAgentTickets(userId: number): Promise<any[]> {
        try {
            return await this._sp.web.lists.getByTitle("ticket").items
                .select("Id", "Title", "Status", "Created", "Author/Id", "Author/Title", "Reference", "Categorie", "Priorite", "Description", "AssignedTo/Id", "AssignedTo/Title")
                .expand("Author", "AssignedTo")
                .filter(`AssignedToId eq ${userId}`)
                .orderBy("Created", false)();
        } catch (error) {
            console.error("Error fetching agent tickets", error);
            throw error;
        }
    }

    public async getAgents(): Promise<any[]> {
        try {
            const users = await this._sp.web.lists.getByTitle("user").items
                .select("Id", "user/Title", "user/Id", "role", "Role")
                .expand("user")();
            return users.filter((u: any) => u.role === 'Agent' || u.Role === 'Agent');
        } catch (error) {
            console.error("Error fetching agents", error);
            throw error;
        }
    }

    public async updateTicket(spId: number, updates: any): Promise<void> {
        try {
            await this._sp.web.lists.getByTitle("ticket").items.getById(spId).update(updates);
        } catch (error) {
            console.error("Error updating ticket", error);
            throw error;
        }
    }

    public async getCurrentUserRole(): Promise<'Admin' | 'Agent' | 'User'> {
        try {
            const currentUser = await this._sp.web.currentUser();
            const userItems = await this._sp.web.lists.getByTitle("user").items
                .filter(`user/Id eq ${currentUser.Id}`)
                .select("role", "Role")();
            
            if (userItems.length > 0) {
                return (userItems[0].role || userItems[0].Role || 'User') as any;
            }
            return 'User';
        } catch (error) {
            console.error("Error checking user role", error);
            return 'User';
        }
    }

    public async getAgentStats(userId: number): Promise<any> {
        try {
            const tickets = await this._sp.web.lists.getByTitle("ticket").items
                .filter(`AssignedToId eq ${userId}`)
                .select("Status", "Statut")();
            
            const open = tickets.filter(t => (t.Status || t.Statut) !== 'Resolved').length;
            const resolved = tickets.filter(t => (t.Status || t.Statut) === 'Resolved').length;
            
            return {
                totalAssigned: tickets.length,
                open: open,
                resolved: resolved
            };
        } catch (error) {
            console.error("Error fetching agent stats", error);
            return { totalAssigned: 0, open: 0, resolved: 0 };
        }
    }

    public async getComments(ticketId: number): Promise<any[]> {
        try {
            // Attempt to get from ticket_comments list
            return await this._sp.web.lists.getByTitle("ticket_comments").items
                .filter(`TicketId eq ${ticketId}`)
                .select("Id", "Text", "Commentaire", "Created", "Author/Title")
                .expand("Author")
                .orderBy("Created", true)();
        } catch (error) {
            console.warn("Could not fetch comments (list might not exist yet)", error);
            return [];
        }
    }

    public async addComment(ticketId: number, text: string): Promise<void> {
        try {
            await this._sp.web.lists.getByTitle("ticket_comments").items.add({
                TicketId: ticketId,
                Commentaire: text,
                Text: text // Duplicate for compatibility
            });
        } catch (error) {
            console.error("Error adding comment", error);
            throw error;
        }
    }

    public async assignToMe(spId: number): Promise<void> {
        try {
            const user = await this._sp.web.currentUser();
            await this.updateTicket(spId, { AssignedToId: user.Id });
        } catch (error) {
            console.error("Error assigning ticket to self", error);
            throw error;
        }
    }
}
