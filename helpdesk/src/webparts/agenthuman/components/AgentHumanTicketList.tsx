import * as React from 'react';
import { useState } from 'react';
import styles from './AgentHuman.module.scss';
import { Icon } from '@fluentui/react';
import { SLACountdown } from '../../helpdesk/components/SLACountdown';
import { SPService } from '../../../services/SPService';

/**
 * Properties for the AgentHumanTicketList component.
 */
export interface ITicketListProps {
  tickets: any[];                          // Full list of tickets assigned to the agent
  onNavigateToDetails: (id: number) => void; // Callback to navigate to a specific ticket's details
  onBack: () => void;                      // Callback to return to the agent dashboard
  spService: SPService;                    // Service for SharePoint operations
}

/**
 * AgentHumanTicketList Component
 * 
 * Renders a searchable and filterable list of tickets assigned to the current agent.
 * Redesigned to match the premium Helpdesk style.
 */
export const AgentHumanTicketList: React.FC<ITicketListProps> = ({ tickets, onNavigateToDetails, onBack, spService }) => {
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = (t.Title || '').toLowerCase().includes(filter.toLowerCase()) || 
                          (t.Reference || '').toLowerCase().includes(filter.toLowerCase());
    const matchesStatus = statusFilter === 'All' || t.Status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className={styles.dashboard}>
      {/* List Header / Filters */}
      <div className={styles.whiteCard} style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ margin: 0, color: 'var(--brand-dark-blue)', fontSize: '1.4rem' }}>My Assigned Tickets</h2>
            <DefaultButton onClick={onBack} style={{ borderRadius: '8px' }}>
                <Icon iconName="ChevronLeft" style={{ marginRight: '8px' }} />
                Back
            </DefaultButton>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
                <Icon iconName="Search" style={{ position: 'absolute', left: '16px', top: '14px', color: '#94a3b8', zIndex: 1 }} />
                <input 
                    type="text" 
                    placeholder="Search by ID or Subject..." 
                    className={styles.input} 
                    style={{ paddingLeft: '44px', width: '100%' }}
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
            </div>
            <div style={{ position: 'relative', minWidth: '200px' }}>
                <Icon iconName="Filter" style={{ position: 'absolute', left: '16px', top: '14px', color: '#94a3b8', zIndex: 1 }} />
                <select 
                    className={styles.select} 
                    style={{ paddingLeft: '44px', width: '100%' }}
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
      </div>

      {/* Ticket List */}
      <div className={styles.ticketList}>
        {filteredTickets.map(t => {
            const status = (t.Status || t.Statut || t.status || 'Pending');
            const sLower = status.toLowerCase();
            let badgeClass = styles.pending;
            if (sLower === 'in progress') badgeClass = styles.inProgress;
            else if (sLower.includes('awaiting')) badgeClass = styles.awaitingFeedback;
            else if (sLower === 'resolved' || sLower === 'resolu') badgeClass = styles.resolved;

            const isHighPrio = (t.Priority || t.Priorite || '').toLowerCase() === 'high' || (t.Priority || t.Priorite || '').toLowerCase() === 'urgent';
            const deadlineDate = t.DueDate ? new Date(t.DueDate) : spService.calculateDeadline(new Date(t.Created), t.Priority || t.Priorite || 'Normal');

            return (
                <div key={t.Id} className={styles.ticketItem} onClick={() => onNavigateToDetails(t.Id)}>
                    <div className={styles.ticketInfo}>
                        <div className={styles.ticketTitle}>
                            <strong>{t.Reference || `TK-${t.Id}`}:</strong> {t.Title}
                        </div>
                        <div className={styles.ticketMeta}>
                            {t.Category || t.Categorie || 'General'} • Requested by {t.Author?.Title || 'User'} • Created {new Date(t.Created).toLocaleDateString()}
                        </div>
                    </div>
                    <div className={styles.ticketBadges}>
                        <span className={`${styles.status} ${badgeClass}`}>{status}</span>
                        {isHighPrio && <span className={`${styles.status} ${styles.urgent}`}>High Priority</span>}
                        {status !== 'Resolved' && (
                            <SLACountdown targetDate={deadlineDate} isResolved={false} />
                        )}
                    </div>
                </div>
            );
        })}

        {filteredTickets.length === 0 && (
            <div className={styles.whiteCard} style={{ textAlign: 'center', padding: '60px' }}>
                <Icon iconName="SearchData" style={{ fontSize: '48px', marginBottom: '16px', color: 'var(--text-muted)' }} />
                <p style={{ color: 'var(--text-muted)' }}>No tickets found matching your filters.</p>
            </div>
        )}
      </div>
    </div>
  );
};

// Internal component for the button to avoid missing imports in this block
const DefaultButton: React.FC<{onClick: () => void, style?: React.CSSProperties, children: React.ReactNode}> = ({onClick, style, children}) => (
    <button className={styles.btnPrimary} style={{ background: 'white', color: 'var(--brand-dark-blue)', border: '1px solid var(--card-border)', boxShadow: 'none', ...style }} onClick={onClick}>
        {children}
    </button>
);
