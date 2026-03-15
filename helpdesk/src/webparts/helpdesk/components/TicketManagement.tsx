import * as React from 'react';
import { useState, useEffect } from 'react';
import styles from './TicketManagement.module.scss';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import { ITicket } from '../MockData';

export interface ITicketManagementProps {
  isDarkTheme: boolean;
  context: WebPartContext;
  onNavigateBack: () => void;
}

export const TicketManagement: React.FC<ITicketManagementProps> = (props) => {
  const { isDarkTheme, context, onNavigateBack } = props;
  const [tickets, setTickets] = useState<ITicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<ITicket[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedTicket, setSelectedTicket] = useState<ITicket | null>(null);
  const [agents, setAgents] = useState<{id: string, name: string}[]>([]);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    fetchTickets().catch(err => console.error(err));
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tickets, statusFilter, categoryFilter, searchQuery]);

  const fetchTickets = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const listUrl = `${context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('ticket')/items`;
      const response: SPHttpClientResponse = await context.spHttpClient.get(listUrl, SPHttpClient.configurations.v1);

      if (response.ok) {
        const data = await response.json();
        if (data.value) {
          const fetchedTickets: ITicket[] = data.value.map((item: any) => {
            const status = item.Statut || item.Status || item.status || 'Pending';
            const category = item.Categorie || item.Category || item.category || 'General';
            const reference = item.Reference || item.reference || `TK-${item.Id}`;
            const priority = item.Priority || item.Priorite || 'Medium';

            return {
              id: reference,
              title: item.Title || item.Titre || 'Untitled',
              status: status as any,
              date: item.Created ? new Date(item.Created).toLocaleDateString() : 'N/A',
              category: category,
              priority: priority as any,
              description: item.Description || item.description || 'No description provided.',
              assignedTo: item.AssignedTo || item.AttribueA || 'Unassigned'
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

  const fetchAgents = async (): Promise<void> => {
    try {
      // Removing $filter because filtering Choice columns via REST often throws 500 errors in SharePoint.
      // We'll fetch all users from the custom list and filter them locally.
      const listUrl = `${context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('user')/items?$select=Id,user/Title,role,Role&$expand=user`;
      console.log('Fetching agents from:', listUrl);
      const response = await context.spHttpClient.get(listUrl, SPHttpClient.configurations.v1);
      
      const data = await response.json();
      console.log('Raw agents data:', data);

      if (response.ok) {
        if (data.value) {
          // Filter locally for 'Agent' role
          const agentItems = data.value.filter((item: any) => item.role === 'Agent' || item.Role === 'Agent');
          
          const fetchedAgents = agentItems.map((item: any) => ({
            id: item.Id.toString(),
            name: item.user?.Title || item.Title || `Agent ${item.Id}`
          }));
          console.log('Mapped agents:', fetchedAgents);
          setAgents(fetchedAgents);
        }
      } else {
        console.error('Failed to fetch agents:', data);
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

  const applyFilters = (): void => {
    let result = [...tickets];

    if (statusFilter !== 'All') {
      result = result.filter(t => t.status === statusFilter);
    }

    if (categoryFilter !== 'All') {
      result = result.filter(t => t.category === categoryFilter);
    }

    if (searchQuery) {
      result = result.filter(t => 
        t.title.toLowerCase().indexOf(searchQuery.toLowerCase()) !== -1 ||
        t.id.toLowerCase().indexOf(searchQuery.toLowerCase()) !== -1
      );
    }

    setFilteredTickets(result);
  };

  const updateTicket = async (ticketId: string, updates: any): Promise<void> => {
    // In a real app, this would be an SPHttpClient.post call to update the list item
    // For this demo, we'll update the local state for immediate feedback
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, ...updates } : t));
    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket({ ...selectedTicket, ...updates });
    }
    alert(`Ticket ${ticketId} updated successfully (Demo Mode)`);
  };

  const getStatusColor = (status: string): string => {
    const s = status.toLowerCase();
    if (s.indexOf('resol') !== -1) return '#107c10';
    if (s.indexOf('progress') !== -1 || s.indexOf('cours') !== -1) return '#0078d4';
    if (s.indexOf('pending') !== -1 || s.indexOf('attente') !== -1) return '#f58220';
    return '#6b7280';
  };

  return (
    <div className={`${styles.ticketManagement} ${isDarkTheme ? styles.dark : ''}`}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h2>Ticket Management</h2>
          <p>Manage and process all helpdesk tickets.</p>
        </div>
        <button className={styles.backButton} onClick={onNavigateBack}>
          Back to Admin Dashboard
        </button>
      </header>

      {/* Filters */}
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
      </div>

      {/* Ticket Table */}
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
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map(ticket => (
                <tr key={ticket.id} onClick={() => setSelectedTicket(ticket)}>
                  <td style={{ fontWeight: 600 }}>{ticket.id}</td>
                  <td>{ticket.title}</td>
                  <td>
                    <span className={styles.statusBadge} style={{ backgroundColor: getStatusColor(ticket.status) + '20', color: getStatusColor(ticket.status) }}>
                      {ticket.status}
                    </span>
                  </td>
                  <td>
                    <span className={ticket.priority === 'High' || ticket.priority === 'Critical' ? styles.priorityHigh : ticket.priority === 'Medium' ? styles.priorityMedium : styles.priorityLow}>
                      {ticket.priority || 'Medium'}
                    </span>
                  </td>
                  <td>{ticket.category}</td>
                  <td>{ticket.date}</td>
                  <td>{ticket.assignedTo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Panel */}
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
                value={selectedTicket.status} 
                onChange={(e) => updateTicket(selectedTicket.id, { status: e.target.value })}
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
                value={selectedTicket.assignedTo} 
                onChange={(e) => updateTicket(selectedTicket.id, { assignedTo: e.target.value })}
              >
                <option value="Unassigned">Unassigned</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.name}>{agent.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <button className={styles.actionButton} onClick={() => setSelectedTicket(null)}>
            Mark as Processed
          </button>
        </div>
      )}
    </div>
  );
};
