import * as React from 'react';
import { useState, useEffect } from 'react';
import styles from './TicketManagement.module.scss';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import { ITicket } from '../../helpdesk/MockData';
import { Icon, TooltipHost } from '@fluentui/react';
import { SPService } from '../../../services/SPService';

/**
 * Properties for the TicketManagement component.
 */
export interface ITicketManagementProps {
  isDarkTheme: boolean;             // Indicates if the dark theme is enabled
  context: WebPartContext;          // SharePoint WebPart context
  spService?: SPService;            // Optional SharePoint service instance
  onNavigateBack: () => void;       // Callback to navigate back to the previous screen
}

/**
 * TicketManagement Component
 * 
 * Renders the interface for managing and processing helpdesk tickets.
 * Provides functionalities to view, search, filter, and update tickets,
 * as well as assigning them to agents.
 * 
 * @param props The properties for this component (ITicketManagementProps)
 */
export const TicketManagement: React.FC<ITicketManagementProps> = (props) => {
  const { isDarkTheme, context, onNavigateBack } = props;
  const [tickets, setTickets] = useState<ITicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<ITicket[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedTicket, setSelectedTicket] = useState<ITicket | null>(null);
  const [agents, setAgents] = useState<{id: string, siteUserId: number, name: string}[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{message: string, onConfirm: () => void} | null>(null);

  // Pending changes in detail panel
  const [pendingStatus, setPendingStatus] = useState<string>('');
  const [pendingAgentId, setPendingAgentId] = useState<number | string>('');

  useEffect(() => {
    if (selectedTicket) {
      setPendingStatus(selectedTicket.status);
      const agent = agents.filter((a: any) => a.name === selectedTicket.assignedTo)[0];
      setPendingAgentId(agent?.siteUserId || '');
    }
  }, [selectedTicket, agents]);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [agentFilter, setAgentFilter] = useState<string>('All');
  const [dateSort, setDateSort] = useState<string>('Newest');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    fetchTickets().catch(err => console.error(err));
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tickets, statusFilter, categoryFilter, agentFilter, dateSort, searchQuery]);

  /**
   * Fetches the list of all tickets from the SharePoint list.
   * Maps the raw SharePoint items to the ITicket structure.
   */
  const fetchTickets = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const listUrl = `${context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('ticket')/items?$select=*,AssignedTo/Title&$expand=AssignedTo`;
      const response: SPHttpClientResponse = await context.spHttpClient.get(listUrl, SPHttpClient.configurations.v1);

      if (response.ok) {
        const data = await response.json();
        if (data.value) {
          const fetchedTickets: ITicket[] = data.value.map((item: any) => {
            const status = item.Statut || item.Status || item.status || 'Pending';
            const category = item.Categorie || item.Category || item.category || 'General';
            const reference = item.Reference || item.reference || `TK-${item.Id}`;
            const priority = item.Priority || item.Priorite || 'Normal';

            return {
              id: reference,
              spId: item.Id,
              title: item.Title || item.Titre || 'Untitled',
              status: status as any,
              date: item.Created ? new Date(item.Created).toLocaleDateString() : 'N/A',
              category: category,
              priority: priority as any,
              description: item.Description || item.description || 'No description provided.',
              assignedTo: item.AssignedTo?.Title || item.AttribueA || 'Unassigned'
            };
          });
          setTickets(fetchedTickets);
        }
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Fetches the list of all agents from the SharePoint 'user' list.
   * Filters users by the 'Agent' role.
   */
  const fetchAgents = async (): Promise<void> => {
    try {
      const listUrl = `${context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('user')/items?$select=Id,user/Title,user/Id,role,Role&$expand=user`;
      const response = await context.spHttpClient.get(listUrl, SPHttpClient.configurations.v1);
      const data = await response.json();

      if (response.ok && data.value) {
        const agentItems = data.value.filter((item: any) => item.role === 'Agent' || item.Role === 'Agent');
        const fetchedAgents = agentItems.map((item: any) => ({
          id: item.Id.toString(),
          siteUserId: item.user?.Id || 0,
          name: item.user?.Title || item.Title || `Agent ${item.Id}`
        }));
        setAgents(fetchedAgents);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  useEffect(() => {
    if (agents.length === 0) {
      fetchAgents().catch(err => console.error(err));
    }
  }, []);

  /**
   * Applies the current status, category, and search query filters to the 
   * fetched tickets and updates the filteredTickets state.
   */
  const applyFilters = (): void => {
    let result = [...tickets];

    if (statusFilter !== 'All') {
      result = result.filter(t => t.status === statusFilter);
    }

    if (categoryFilter !== 'All') {
      result = result.filter(t => t.category === categoryFilter);
    }

    if (agentFilter !== 'All') {
      result = result.filter(t => (t.assignedTo || 'Unassigned') === agentFilter);
    }

    if (searchQuery) {
      result = result.filter(t => 
        (t.title || '').toLowerCase().indexOf(searchQuery.toLowerCase()) !== -1 ||
        (t.id || '').toLowerCase().indexOf(searchQuery.toLowerCase()) !== -1
      );
    }

    // Apply exact sorting based on SP IDs (chronological sequence)
    result.sort((a, b) => {
      if (dateSort === 'Newest') return (b.spId || 0) - (a.spId || 0);
      if (dateSort === 'Oldest') return (a.spId || 0) - (b.spId || 0);
      return 0;
    });

    setFilteredTickets(result);
  };

  /**
   * Generates a CSV file from the currently filtered tickets and triggers a download.
   */
  const exportToExcel = (): void => {
    const headers = ["Ticket ID", "Title", "Status", "Priority", "Category", "Assigned To", "Created Date"];
    
    // Map tickets to rows, escaping quotes to preserve text structure
    const rows = filteredTickets.map(ticket => [
      ticket.id || '',
      `"${(ticket.title || '').replace(/"/g, '""')}"`,
      ticket.status || '',
      ticket.priority || '',
      ticket.category || '',
      `"${(ticket.assignedTo || 'Unassigned').replace(/"/g, '""')}"`,
      ticket.date
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    
    // Create Blob with UTF-8 BOM so Excel opens characters (e.g. accents) correctly
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); 
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Tickets_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * Updates a specific ticket both locally and in SharePoint.
   * Prompts the user for confirmation before making the update.
   * 
   * @param ticketId The custom reference ID of the ticket
   * @param spId The SharePoint list item ID of the ticket
   * @param updates The local state object updates to apply to the ticket
   * @param spUpdatePayload The metadata payload object to send to SharePoint
   */
  const updateTicket = async (ticketId: string, spId: number | undefined, updates: any, spUpdatePayload: any): Promise<void> => {
    setConfirmDialog({
      message: `Are you sure you want to apply these updates to ticket ${ticketId}?`,
      onConfirm: async () => {
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, ...updates } : t));
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket({ ...selectedTicket, ...updates });
        }

        if (!spId) {
           console.error("No SharePoint ID found for ticket", ticketId);
           return;
        }

        try {
          const listUrl = `${context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('ticket')/items(${spId})`;
          const response = await context.spHttpClient.post(listUrl, SPHttpClient.configurations.v1, {
            headers: {
              'Accept': 'application/json;odata=nometadata',
              'Content-type': 'application/json;odata=nometadata',
              'odata-version': '',
              'IF-MATCH': '*',
              'X-HTTP-Method': 'MERGE'
            },
            body: JSON.stringify(spUpdatePayload)
          });
          if (!response.ok) {
            const errAlert = await response.json();
            alert(`Failed to update ticket: ${errAlert.error?.message?.value || 'Unknown error'}`);
          }
        } catch (err) {
          console.error('Error updating ticket:', err);
          alert('An unexpected error occurred while saving to SharePoint.');
        }
      }
    });
  };

  /**
   * Deletes a ticket from SharePoint and updates the local state.
   * Prompts the user for confirmation before deletion.
   * 
   * @param spId The SharePoint list item ID of the ticket
   * @param reference The reference ID of the ticket (for display)
   */
  const handleDeleteTicket = (spId: number | undefined, reference: string): void => {
    if (!spId) return;

    setConfirmDialog({
      message: `Are you sure you want to PERMANENTLY delete ticket ${reference}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          if (props.spService) {
            await props.spService.deleteTicket(spId);
            setTickets(prev => prev.filter(t => t.spId !== spId));
          } else {
            // Fallback to manual if service not present (though it should be)
            const listUrl = `${context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('ticket')/items(${spId})`;
            const response = await context.spHttpClient.post(listUrl, SPHttpClient.configurations.v1, {
              headers: {
                'Accept': 'application/json;odata=nometadata',
                'IF-MATCH': '*',
                'X-HTTP-Method': 'DELETE'
              }
            });

            if (response.ok) {
              setTickets(prev => prev.filter(t => t.spId !== spId));
            } else {
              const errData = await response.json();
              alert(`Failed to delete ticket: ${errData.error?.message?.value || 'Unknown error'}`);
            }
          }
        } catch (err) {
          console.error('Error deleting ticket:', err);
          alert('An unexpected error occurred while deleting the ticket.');
        }
      }
    });
  };

  /**
   * Determines the corresponding hex color code based on the given ticket status.
   * 
   * @param status The status string (e.g., 'Resolved', 'In Progress')
   * @returns Hexadecimal color string.
   */
  const getStatusColor = (status: string): string => {
    const s = (status || '').toLowerCase();
    if (s.indexOf('resol') !== -1) return '#107c10';
    if (s.indexOf('progress') !== -1 || s.indexOf('cours') !== -1) return '#0078d4';
    if (s.indexOf('awaiting') !== -1) return '#f59e0b';
    if (s.indexOf('pending') !== -1 || s.indexOf('attente') !== -1) return '#f58220';
    return '#6b7280';
  };

  return (
    <div className={`${styles.ticketManagement} ${isDarkTheme ? styles.dark : ''}`}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h2>Ticket Management</h2>
          <p>Manage and process all helpdesk tickets. {isLoading && '(Loading...)'}</p>
        </div>
        <button className={styles.backButton} onClick={onNavigateBack}>
          Back to Dashboard
        </button>
      </header>

      {/* Filters Card */}
      <div className={styles.card}>
        <div className={styles.filtersSection}>
          <div className={styles.filterGroup}>
            <label>Search</label>
            <input 
              type="text" 
              placeholder="Search by ID or Title..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className={styles.filterGroup}>
            <label>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Awaiting Feedback">Awaiting Feedback</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label>Category</label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="All">All Categories</option>
              <option value="IT Support">IT Support</option>
              <option value="HR">HR</option>
              <option value="Hardware">Hardware</option>
              <option value="Software">Software</option>
              <option value="Facilities">Facilities</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label>Agent</label>
            <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}>
              <option value="All">All Agents</option>
              {agents.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              <option value="Unassigned">Unassigned</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label>Date Sort</label>
            <select value={dateSort} onChange={(e) => setDateSort(e.target.value)}>
              <option value="Newest">Newest First</option>
              <option value="Oldest">Oldest First</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
            <button 
                onClick={exportToExcel}
                style={{ background: '#107c41', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.2s', boxShadow: '0 2px 4px rgba(16,124,65,0.2)' }}
                onMouseOver={(e) => e.currentTarget.style.background = '#0b5c30'}
                onMouseOut={(e) => e.currentTarget.style.background = '#107c41'}
            >
                <i className="ms-Icon ms-Icon--ExcelDocument" aria-hidden="true" style={{ fontSize: '16px' }} />
                Export to Excel (.csv)
            </button>
        </div>
      </div>

      {/* Ticket Table Card */}
      <div className={styles.card}>
        <div className={styles.tableContainer}>
          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>Loading tickets...</div>
          ) : (
            <table className={styles.ticketTable}>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Assigned To</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map(ticket => (
                  <tr key={ticket.id}>
                    <td style={{ fontWeight: 600 }}>{ticket.id}</td>
                    <td>{ticket.title}</td>
                    <td>
                      <span className={styles.statusBadge} style={{ backgroundColor: getStatusColor(ticket.status) + '20', color: getStatusColor(ticket.status) }}>
                        {ticket.status}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.priorityChip} ${
                        ticket.priority === 'High' || ticket.priority === 'Urgent' ? styles.high :
                        ticket.priority === 'Normal' ? styles.medium :
                        styles.low
                      }`}>
                        {ticket.priority || 'Normal'}
                      </span>
                    </td>
                    <td>{ticket.category}</td>
                    <td>{ticket.date}</td>
                    <td>{ticket.assignedTo}</td>
                    <td>
                      <div style={{ display: 'flex' }}>
                        <TooltipHost content="Edit Ticket">
                          <button className={styles.modifyBtn} onClick={() => setSelectedTicket(ticket)}>
                            <Icon iconName="Edit" />
                          </button>
                        </TooltipHost>
                        <TooltipHost content="Delete Ticket">
                          <button className={styles.deleteBtn} onClick={() => handleDeleteTicket(ticket.spId, ticket.id)}>
                            <Icon iconName="Delete" />
                          </button>
                        </TooltipHost>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail Side Panel */}
      {selectedTicket && (
        <div className={styles.sidePanel}>
          <div className={styles.panelHeader}>
            <h3>Ticket Details</h3>
            <button className={styles.closeButton} onClick={() => setSelectedTicket(null)}>&times;</button>
          </div>
          
          <div className={styles.panelContent}>
            <div className={styles.detailGroup}>
              <label>Reference</label>
              <p><strong>{selectedTicket.id}</strong></p>
            </div>
            <div className={styles.detailGroup}>
              <label>Title</label>
              <p>{selectedTicket.title}</p>
            </div>
            <div className={styles.detailGroup}>
              <label>Description</label>
              <p>{selectedTicket.description}</p>
            </div>
            
            <div className={styles.detailGroup}>
              <label>Update Status</label>
              <select 
                value={pendingStatus} 
                onChange={(e) => setPendingStatus(e.target.value)}
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Awaiting Feedback">Awaiting Feedback</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>

            <div className={styles.detailGroup}>
              <label>Assign to Agent</label>
              <select 
                value={pendingAgentId} 
                onChange={(e) => setPendingAgentId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.siteUserId}>{agent.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className={styles.panelFooter}>
            <button className={styles.actionButton} onClick={() => {
              const currentAgent = agents.filter((a: any) => a.name === selectedTicket.assignedTo)[0];
              const currentAgentId = currentAgent?.siteUserId || '';
              
              const statusChanged = pendingStatus !== selectedTicket.status;
              const agentChanged = pendingAgentId.toString() !== currentAgentId.toString();

              if (statusChanged || agentChanged) {
                const updates: any = {};
                const spUpdates: any = {};
                
                if (statusChanged) {
                  updates.status = pendingStatus;
                  spUpdates.Status = pendingStatus;
                }
                
                if (agentChanged) {
                  if (!pendingAgentId) {
                    updates.assignedTo = 'Unassigned';
                    spUpdates.AssignedToId = null;
                  } else {
                    const newAgent = agents.filter((a: any) => a.siteUserId.toString() === pendingAgentId.toString())[0];
                    updates.assignedTo = newAgent?.name || 'Assigned';
                    spUpdates.AssignedToId = parseInt(pendingAgentId.toString(), 10);
                  }
                }

                updateTicket(selectedTicket.id, selectedTicket.spId, updates, spUpdates);
                setSelectedTicket(null);
              } else {
                setSelectedTicket(null);
              }
            }}>
              Okay
            </button>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmDialog && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Confirm Action</h3>
            <p>{confirmDialog.message}</p>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setConfirmDialog(null)}>Cancel</button>
              <button className={styles.confirmBtn} onClick={() => {
                confirmDialog.onConfirm();
                setConfirmDialog(null);
              }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
