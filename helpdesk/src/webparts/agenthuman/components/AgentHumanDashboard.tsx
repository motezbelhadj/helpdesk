import * as React from 'react';
import styles from './AgentHuman.module.scss';
import { Icon } from '@fluentui/react';

/**
 * Properties for the AgentHumanDashboard component.
 */
export interface IDashboardProps {
  tickets: any[];                          // List of tickets assigned to the agent
  onNavigateToList: () => void;            // Callback to navigate to the full ticket list
  onNavigateToDetails: (id: number) => void; // Callback to navigate to a specific ticket's details
  onNavigateToLeaderboard: () => void;     // Callback to navigate to the gamification leaderboard
  userPageUrl?: string;                    // Optional URL to the user portal
}

/**
 * AgentHumanDashboard Component
 * 
 * Displays the agent's command center overview, including key performance 
 * indicators (KPIs) and a list of urgent tickets requiring immediate action.
 * 
 * Redesigned to match the Helpdesk premium style.
 */
export const AgentHumanDashboard: React.FC<IDashboardProps> = ({ tickets, onNavigateToList, onNavigateToDetails, onNavigateToLeaderboard }) => {
  const stats = {
    pending: tickets.filter(t => {
      const s = (t.Status || t.Statut || t.status || '').toLowerCase();
      return s === 'pending' || s === 'nouveau' || s === 'new';
    }).length,
    inProgress: tickets.filter(t => {
      const s = (t.Status || t.Statut || t.status || '').toLowerCase();
      return s === 'in progress' || s === 'en cours' || s === 'awaiting feedback';
    }).length,
    resolved: tickets.filter(t => {
      const s = (t.Status || t.Statut || t.status || '').toLowerCase();
      return s === 'resolved' || s === 'resolu' || s === 'résolu';
    }).length,
    urgent: tickets.filter(t => {
      const p = (t.Priority || t.Priorite || '').toLowerCase();
      return p === 'high' || p === 'haute' || p === 'urgent';
    }).length
  };

  const urgentTickets = tickets
    .filter(t => {
      const p = (t.Priority || t.Priorite || '').toLowerCase();
      const s = (t.Status || t.Statut || t.status || '').toLowerCase();
      const isUrgent = p === 'high' || p === 'haute' || p === 'urgent';
      const isNotResolved = s !== 'resolved' && s !== 'resolu' && s !== 'résolu';
      return isUrgent && isNotResolved;
    })
    .slice(0, 5);

  return (
    <div className={styles.dashboard}>
      {/* KPI Row */}
      <div className={styles.kpiRow}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiValue} style={{ color: '#3b82f6' }}>{stats.pending}</span>
          <span className={styles.kpiLabel}>Pending Requests</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiValue} style={{ color: 'var(--brand-orange)' }}>{stats.inProgress}</span>
          <span className={styles.kpiLabel}>In Progress</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiValue} style={{ color: '#10b981' }}>{stats.resolved}</span>
          <span className={styles.kpiLabel}>Resolved</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiValue} style={{ color: '#ef4444' }}>{stats.urgent}</span>
          <span className={styles.kpiLabel}>Urgent Priority</span>
        </div>
      </div>

      {/* Urgent Attention Section */}
      <section className={styles.section}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <Icon iconName="Warning" style={{ color: '#ef4444', fontSize: '20px' }} />
          <h3 style={{ margin: 0, border: 'none' }}>Urgent Attention Required</h3>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>Immediate action is needed for the following high-priority cases.</p>

        {urgentTickets.length > 0 ? (
          <div className={styles.ticketList}>
            {urgentTickets.map(t => {
              const status = (t.Status || t.Statut || t.status || 'Pending');
              const sLower = status.toLowerCase();
              let badgeClass = styles.pending;
              if (sLower === 'in progress') badgeClass = styles.inProgress;
              else if (sLower.includes('awaiting')) badgeClass = styles.awaitingFeedback;
              else if (sLower === 'resolved' || sLower === 'resolu') badgeClass = styles.resolved;

              return (
                <div key={t.Id} className={styles.ticketItem} onClick={() => onNavigateToDetails(t.Id)}>
                  <div className={styles.ticketInfo}>
                    <div className={styles.ticketTitle}>
                      <strong>{t.Reference || `TK-${t.Id}`}:</strong> {t.Title}
                    </div>
                    <div className={styles.ticketMeta}>
                      {t.Category || t.Categorie || 'General'} • Requested by {t.Author?.Title || 'User'}
                    </div>
                  </div>
                  <div className={styles.ticketBadges}>
                    <span className={`${styles.status} ${badgeClass}`}>{status}</span>
                    <span className={`${styles.status} ${styles.urgent}`}>Urgent</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
            <Icon iconName="Completed" style={{ fontSize: '48px', color: '#10b981', marginBottom: '16px' }} />
            <p style={{ fontWeight: 600, color: 'var(--brand-dark-blue)' }}>No urgent tickets at the moment. Well done!</p>
          </div>
        )}

        <div style={{ marginTop: '24px', textAlign: 'right' }}>
          <button className={styles.btnPrimary} onClick={onNavigateToList}>
            View Full Queue
          </button>
        </div>
      </section>
    </div>
  );
};
