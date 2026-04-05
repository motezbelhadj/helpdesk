import * as React from 'react';
import { useState } from 'react';
import styles from './AgentHuman.module.scss';
import { Icon } from '@fluentui/react';

/**
 * Properties for the AgentHumanTicketList component.
 */
export interface ITicketListProps {
  tickets: any[];                          // Full list of tickets assigned to the agent
  onNavigateToDetails: (id: number) => void; // Callback to navigate to a specific ticket's details
  onBack: () => void;                      // Callback to return to the agent dashboard
}

/**
 * AgentHumanTicketList Component
 * 
 * Renders a searchable and filterable table of tickets assigned to the current agent.
 */
export const AgentHumanTicketList: React.FC<ITicketListProps> = ({ tickets, onNavigateToDetails, onBack }) => {
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.Title?.toLowerCase().includes(filter.toLowerCase()) || 
                          t.Reference?.toLowerCase().includes(filter.toLowerCase());
    const matchesStatus = statusFilter === 'All' || t.Status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className={styles.section}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h2 style={{ margin: 0, color: 'var(--brand-dark-blue)', fontSize: '1.5rem' }}>My Assigned Tickets</h2>
        <button onClick={onBack} className={styles.btnPrimary} style={{ background: '#64748b', boxShadow: 'none' }}>
           <Icon iconName="ChevronLeft" style={{ marginRight: '8px' }} />
           Back to Dashboard
        </button>
      </header>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Icon iconName="Search" style={{ position: 'absolute', left: '16px', top: '14px', color: '#94a3b8' }} />
          <input 
            type="text" 
            placeholder="Search by ID or Subject..." 
            className={styles.input} 
            style={{ paddingLeft: '44px' }}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div style={{ position: 'relative', minWidth: '200px' }}>
          <Icon iconName="Filter" style={{ position: 'absolute', left: '16px', top: '14px', color: '#94a3b8' }} />
          <select 
            className={styles.select} 
            style={{ paddingLeft: '44px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
             <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Awaiting Feedback">Awaiting Feedback</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      </div>

      <table className={styles.ticketTable}>
        <thead>
          <tr>
            <th>Titre</th>
            <th>Reference</th>
            <th>Description</th>
            <th>Categorie</th>
            <th>Priorite</th>
            <th>Cree par</th>
            <th>AssignedTo</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {filteredTickets.map(t => (
            <tr key={t.Id} onClick={() => onNavigateToDetails(t.Id)}>
              <td style={{ fontWeight: 700, color: 'var(--brand-dark-blue)' }}>{t.Title}</td>
              <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{t.Reference || `TK-${t.Id}`}</td>
              <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem', color: '#64748b' }}>
                {t.Description}
              </td>
              <td>
                <span className={styles.status} style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>
                  {t.Category || t.Categorie || 'General'}
                </span>
              </td>
              <td>
                <span className={`${styles.status} ${
                  (t.Priority === 'High' || t.Priorite === 'Haute') ? styles.high : 
                  (t.Priority === 'Urgent' || t.Priorite === 'Urgent') ? styles.urgent : ''
                }`}>
                  {t.Priority || t.Priorite || 'Normal'}
                </span>
              </td>
              <td style={{ fontSize: '0.85rem' }}>{t.Author?.Title || 'User'}</td>
              <td style={{ fontSize: '0.85rem' }}>{t.AssignedTo?.Title || 'Unassigned'}</td>
              <td>
                <span className={`${styles.status} ${
                  t.Status === 'In Progress' ? styles.inProgress : 
                  t.Status === 'Pending' ? styles.pending : 
                  t.Status === 'Awaiting Feedback' ? styles.awaitingFeedback :
                  t.Status === 'Resolved' || t.Status === 'Resolu' || t.status === 'Resolved' ? styles.resolved :
                  styles.pending}`}>
                  {t.Status || 'Pending'}
                </span>
              </td>
              <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {t.Created ? new Date(t.Created).toLocaleDateString() : 'N/A'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {filteredTickets.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          <Icon iconName="SearchData" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }} />
          <p>No tickets found matching your filters.</p>
        </div>
      )}
    </div>
  );
};
