import { WebPartContext } from "@microsoft/sp-webpart-base";
import { spfi, SPFI, SPFx } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import "@pnp/sp/site-users/web";
import "@pnp/sp/files";
import "@pnp/sp/folders";
import "@pnp/sp/attachments";

/**
 * Service for interacting with SharePoint using PnPjs.
 * Handles ticket creation, retrieval, updates, user roles, and comments.
 */
export class SPService {
    public _sp: SPFI;
    private readonly SLA_CONFIG: { [key: string]: number } = {
        'Urgent': 2,
        'High': 8,
        'Normal': 24,
        'Low': 48
    };

    constructor(context: WebPartContext) {
        this._sp = spfi().using(SPFx(context));
    }

    /**
     * Creates a new ticket in the SharePoint 'ticket' list.
     * Optionally adds an attachment to the created item.
     * 
     * @param ticketDetails The metadata for the new ticket
     * @param attachment Optional file attachment
     */
    public async createTicket(ticketDetails: any, attachment: File | null): Promise<void> {
        try {
            // Get current user to populate Creepar (Person column)
            const user = await this._sp.web.currentUser();
            
            const priority = ticketDetails.Priorite || 'Normal';
            const hoursToAdd = this.SLA_CONFIG[priority] || 24;
            const dueDate = new Date();
            dueDate.setHours(dueDate.getHours() + hoursToAdd);

            const payload = {
                ...ticketDetails,
                CreeparId: user.Id,
                DueDate: dueDate.toISOString()
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

    /**
     * Retrieves all tickets created by a specific user.
     * 
     * @param userId The SharePoint ID of the user
     * @returns A promise that resolves to an array of ticket items
     */
    public async getUserTickets(userId: number): Promise<any[]> {
        try {
            return await this._sp.web.lists.getByTitle("ticket").items
                .select("Id", "Title", "Status", "Created", "Modified", "Author/Id", "Author/Title", "Editor/Title", "Reference", "Categorie", "Priorite", "Description", "DueDate")
                .expand("Author", "Editor")
                .filter(`Author/Id eq ${userId}`)
                .orderBy("Modified", false)();
        } catch (error) {
            console.error("Error fetching user tickets", error);
            throw error;
        }
    }

    /**
     * Retrieves all tickets from the 'ticket' list.
     * 
     * @returns A promise that resolves to an array of all ticket items
     */
    public async getAllTickets(): Promise<any[]> {
        try {
            return await this._sp.web.lists.getByTitle("ticket").items
                .select("Id", "Title", "Status", "Created", "Author/Id", "Author/Title", "Reference", "Categorie", "Priorite", "Description", "AssignedTo/Id", "AssignedTo/Title", "DueDate")
                .expand("Author", "AssignedTo")
                .orderBy("Created", false)();
        } catch (error) {
            console.error("Error fetching all tickets", error);
            throw error;
        }
    }

    /**
     * Retrieves all tickets assigned to a specific agent.
     * 
     * @param userId The SharePoint ID of the agent
     * @returns A promise that resolves to an array of tickets assigned to the agent
     */
    public async getAgentTickets(userId: number): Promise<any[]> {
        try {
            return await this._sp.web.lists.getByTitle("ticket").items
                .select("Id", "Title", "Status", "Created", "Author/Id", "Author/Title", "Reference", "Categorie", "Priorite", "Description", "AssignedTo/Id", "AssignedTo/Title", "DueDate")
                .expand("Author", "AssignedTo")
                .filter(`AssignedToId eq ${userId}`)
                .orderBy("Created", false)();
        } catch (error) {
            console.error("Error fetching agent tickets", error);
            throw error;
        }
    }

    /**
     * Retrieves all users with the 'Agent' role from the 'user' list.
     * 
     * @returns A promise that resolves to an array of agent users
     */
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

    /**
     * Updates an existing ticket item in SharePoint.
     * 
     * @param spId The SharePoint ID of the ticket
     * @param updates An object containing the fields to update
     */
    public async updateTicket(spId: number, updates: any): Promise<void> {
        try {
            await this._sp.web.lists.getByTitle("ticket").items.getById(spId).update(updates);
        } catch (error) {
            console.error("Error updating ticket", error);
            throw error;
        }
    }

    /**
     * Determines the role of the current user based on the 'user' list.
     * 
     * @returns A promise that resolves to the user's role string
     */
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

    /**
     * Retrieves the SharePoint profile of the current user.
     * 
     * @returns A promise that resolves to the current user's profile object
     */
    public async getCurrentUserProfile(): Promise<any> {
        try {
            return await this._sp.web.currentUser();
        } catch (error) {
            console.error("Error fetching current user profile", error);
            return null;
        }
    }

    /**
     * Retrieves the full item from the 'user' list for the current user.
     * 
     * @returns A promise that resolves to the user list item
     */
    public async getCurrentUserListItem(): Promise<any> {
        try {
            const user = await this._sp.web.currentUser();
            const items = await this._sp.web.lists.getByTitle("user").items
                .filter(`user/Id eq ${user.Id}`)
                .select("Id", "role", "status", "Department", "JobTitle", "Specialization", "PhoneNumber")();
            
            return items.length > 0 ? items[0] : null;
        } catch (error) {
            console.error("Error fetching current user list item", error);
            return null;
        }
    }

    /**
     * Updates an existing user profile in the 'user' list.
     * 
     * @param itemId The SharePoint ID of the user item
     * @param updates An object containing the fields to update
     */
    public async updateUserProfile(itemId: number, updates: any): Promise<void> {
        try {
            await this._sp.web.lists.getByTitle("user").items.getById(itemId).update(updates);
        } catch (error) {
            console.error("Error updating user profile", error);
            throw error;
        }
    }

    /**
     * Calculates statistics (total, open, resolved) for a specific agent.
     * 
     * @param userId The SharePoint ID of the agent
     * @returns A promise that resolves to a stats object
     */
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

    /**
     * Retrieves all comments for a specific ticket from the 'ticket_comments' list.
     * 
     * @param ticketId The SharePoint ID of the ticket
     * @returns A promise that resolves to an array of comment items
     */
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

    /**
     * Adds a new comment to a ticket in the 'ticket_comments' list.
     * 
     * @param ticketId The SharePoint ID of the ticket
     * @param text The content of the comment
     */
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

    /**
     * Assigns a ticket to the current user.
     * 
     * @param spId The SharePoint ID of the ticket
     */
    public async assignToMe(spId: number): Promise<void> {
        try {
            const user = await this._sp.web.currentUser();
            await this.updateTicket(spId, { AssignedToId: user.Id });
        } catch (error) {
            console.error("Error assigning ticket to self", error);
            throw error;
        }
    }

    /**
     * Deletes a ticket from the 'ticket' list.
     * 
     * @param itemId The SharePoint ID of the ticket
     */
    public async deleteTicket(itemId: number): Promise<void> {
        try {
            await this._sp.web.lists.getByTitle("ticket").items.getById(itemId).delete();
        } catch (error) {
            console.error("Error deleting ticket", error);
            throw error;
        }
    }

    /**
     * Calculates the deadline for a ticket based on its creation date and priority.
     * 
     * @param createdDate The creation date of the ticket
     * @param priority The priority of the ticket
     * @returns The calculated deadline Date object
     */
    public calculateDeadline(createdDate: Date, priority: string): Date {
        const hoursToAdd = this.SLA_CONFIG[priority] || 24;
        const deadline = new Date(createdDate.getTime());
        deadline.setHours(deadline.getHours() + hoursToAdd);
        return deadline;
    }
}
