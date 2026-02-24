import * as React from 'react';
import styles from './Dashboard.module.scss';
import { MOCK_TICKETS, MOCK_ANNOUNCEMENTS, MOCK_HISTORY } from '../MockData';
import { escape } from '@microsoft/sp-lodash-subset';

export interface IDashboardProps {
    userDisplayName: string;
    isDarkTheme: boolean;
}

export const HelpdeskDashboard: React.FC<IDashboardProps> = (props) => {
    const { userDisplayName, isDarkTheme } = props;

    return (
        <div className={`${styles.helpdeskDashboard} ${isDarkTheme ? styles.dark : ''}`}>
            {/* 1. Smart Search & Instant Resolution */}
            <header className={styles.searchHeader}>
                <h1>Hello, {escape(userDisplayName)}</h1>
                <p>How can we help you today?</p>
                <div className={styles.searchInputWrapper}>
                    <input type="text" placeholder="Describe your issue (e.g., 'I can't access my email')..." />
                </div>
            </header>

            <div className={styles.grid}>
                <div className={styles.leftColumn}>
                    {/* 2. Request Hub */}
                    <section className={styles.section}>
                        <div className={styles.glassCard}>
                            <h3>Quick Actions</h3>
                            <div className={styles.quickActions}>
                                <div className={styles.actionButton}>
                                    <span>➕</span>
                                    <div>New Ticket</div>
                                </div>
                                <div className={styles.actionButton}>
                                    <span>❓</span>
                                    <div>Common Fixes</div>
                                </div>
                                <div className={styles.actionButton}>
                                    <span>📋</span>
                                    <div>My HR Requests</div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 3. Active Requests at a Glance */}
                    <section className={styles.section}>
                        <h3>Your Active Tickets</h3>
                        {MOCK_TICKETS.map(ticket => {
                            const statusKey = ticket.status.replace(/\s+/g, '').charAt(0).toLowerCase() + ticket.status.replace(/\s+/g, '').slice(1);
                            const statusStyle = styles[statusKey as keyof typeof styles] || '';
                            return (
                                <div key={ticket.id} className={`${styles.statusCard} ${statusStyle}`}>
                                    <div>
                                        <strong>{ticket.id}</strong>: {ticket.title}
                                        <div style={{ fontSize: '0.8em', color: '#605e5c' }}>{ticket.category} • Created {ticket.date}</div>
                                    </div>
                                    <span className={styles.badge}>{ticket.status}</span>
                                </div>
                            );
                        })}
                    </section>
                </div>


                <div className={styles.rightColumn}>
                    {/* 4. Maintenance & Important Updates */}
                    <section className={styles.section}>
                        <div className={styles.glassCard}>
                            <h3>System Status</h3>
                            {MOCK_ANNOUNCEMENTS.map(ann => (
                                <div key={ann.id} style={{ marginBottom: '16px', paddingLeft: '12px', borderLeft: `3px solid ${ann.severity === 'warning' ? '#ffb900' : '#0078d4'}` }}>
                                    <div style={{ fontWeight: 600 }}>{ann.title}</div>
                                    <div style={{ fontSize: '0.9em' }}>{ann.content}</div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 5. Recent History & Solutions */}
                    <section className={styles.section}>
                        <h3>Resolved Recently</h3>
                        {MOCK_HISTORY.map(ticket => (
                            <div key={ticket.id} className={styles.statusCard} style={{ borderLeftColor: '#107c10', opacity: 0.8 }}>
                                <div>
                                    <strong>{ticket.id}</strong>: {ticket.title}
                                    <div style={{ fontSize: '0.8em' }}>{ticket.category} • Resolved {ticket.date}</div>
                                </div>
                                <span className={styles.badge} style={{ backgroundColor: '#dff6dd', color: '#107c10' }}>Resolved</span>
                            </div>
                        ))}
                    </section>
                </div>
            </div>
        </div>
    );
};
