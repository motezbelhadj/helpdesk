import * as React from 'react';
import styles from './AgentHuman.module.scss';
import { Icon } from '@fluentui/react';

export interface IDashboardProps {
  tickets: any[];
  onNavigateToList: () => void;
  onNavigateToDetails: (id: number) => void;
  userPageUrl?: string;
}

export const AgentHumanDashboard: React.FC<IDashboardProps> = ({ tickets, onNavigateToList, onNavigateToDetails, userPageUrl }) => {
  const stats = {
    pending: tickets.filter(t => t.Status === 'Pending' || t.Statut === 'Nouveau' || t.status === 'Pending').length,
    inProgress: tickets.filter(t => t.Status === 'In Progress' || t.Statut === 'En cours' || t.Status === 'Awaiting Feedback').length,
    resolved: tickets.filter(t => t.Status === 'Resolved' || t.Statut === 'Resolu' || t.status === 'Resolved').length,
    urgent: tickets.filter(t => t.Priority === 'High' || t.Priorite === 'Haute' || t.Priority === 'Urgent' || t.Priorite === 'Urgent' || t.Priorite === 'Haute').length
  };

  const urgentTickets = tickets
    .filter(t => t.Priority === 'High' || t.Priorite === 'Haute' || t.Priority === 'Urgent' || t.Priorite === 'Urgent')
    .slice(0, 5);

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div>
          <h2>Agent Command Center</h2>
          <p style={{ margin: '8px 0 0 0', opacity: 0.8, fontSize: '0.9rem' }}>Welcome back. Here is your service overview.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className={styles.btnPrimary} style={{ background: 'var(--brand-text-white)', color: 'var(--brand-orange)' }} onClick={onNavigateToList}>
            <Icon iconName="List" style={{ marginRight: '8px' }} />
            My Ticket Queue
          </button>
          {userPageUrl && (
            <button className={styles.btnPrimary} style={{ background: 'rgba(255,255,255,0.2)', boxShadow: 'none' }} onClick={() => window.location.href = userPageUrl}>
              <Icon iconName="Back" style={{ marginRight: '8px' }} />
              User Portal
            </button>
          )}
        </div>
      </header>

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
          <span className={styles.kpiLabel}>Resolved Today</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiValue} style={{ color: '#ef4444' }}>{stats.urgent}</span>
          <span className={styles.kpiLabel}>Urgent Priority</span>
        </div>
      </div>

      <section className={styles.section}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <Icon iconName="Warning" style={{ color: '#ef4444', fontSize: '20px' }} />
          <h3 style={{ margin: 0, border: 'none' }}>Urgent Attention Required</h3>
        </div>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>Immediate action is needed for the following high-priority cases.</p>
        
        {urgentTickets.length > 0 ? (
          <table className={styles.ticketTable}>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Subject</th>
                <th>Category</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {urgentTickets.map(t => (
                <tr key={t.Id} onClick={() => onNavigateToDetails(t.Id)}>
                  <td style={{ fontWeight: 700, color: 'var(--brand-dark-blue)' }}>{t.Reference || `TK-${t.Id}`}</td>
                  <td>{t.Title}</td>
                  <td>{t.Category || 'General'}</td>
                  <td>
                    <span className={`${styles.status} ${
                      t.Status === 'In Progress' ? styles.inProgress : 
                      t.Status === 'Awaiting Feedback' ? styles.awaitingFeedback :
                      styles.pending}`}>
                      {t.Status || 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', background: '#f8fafc', borderRadius: '12px' }}>
            <Icon iconName="Completed" style={{ fontSize: '48px', color: '#10b981', marginBottom: '16px' }} />
            <p style={{ fontWeight: 600, color: '#1e293b' }}>No urgent tickets at the moment. Well done!</p>
          </div>
        )}
      </section>
    </div>
  );
};
