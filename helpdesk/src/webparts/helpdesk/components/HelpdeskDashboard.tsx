import * as React from 'react';
import { useState, useEffect } from 'react';
import styles from './Dashboard.module.scss';
import { ITicket, MOCK_ANNOUNCEMENTS } from '../MockData';
import { escape } from '@microsoft/sp-lodash-subset';
import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import { WebPartContext } from '@microsoft/sp-webpart-base';

export interface IDashboardProps {
    userDisplayName: string;
    isDarkTheme: boolean;
    context: WebPartContext;
}

export const HelpdeskDashboard: React.FC<IDashboardProps> = (props) => {
    const { userDisplayName, isDarkTheme, context } = props;
    const [activeTickets, setActiveTickets] = useState<ITicket[]>([]);
    const [resolvedTickets, setResolvedTickets] = useState<ITicket[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchTickets = async (): Promise<void> => {
            setIsLoading(true);
            try {
                // Get current user ID (site-specific integer)
                const userId = (context.pageContext as any).legacyPageContext.userId;
                // Fetch only items created by the current user
                const listUrl = `${context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('ticket')/items?$filter=AuthorId eq ${userId}`;
                const response: SPHttpClientResponse = await context.spHttpClient.get(listUrl, SPHttpClient.configurations.v1);

                if (response.ok) {
                    const data = await response.json();

                    if (data.value && data.value.length > 0) {
                        const tickets: ITicket[] = data.value.map((item: any) => {
                            const status = item.Statut || item.Status || item.status || 'Pending';
                            const category = item.Categorie || item.Category || item.category || 'General';
                            const reference = item.Reference || item.reference || `TK-${item.Id}`;

                            return {
                                id: reference,
                                title: item.Title || item.Titre || 'Untitled',
                                status: status as any,
                                date: item.Created ? new Date(item.Created).toLocaleDateString() : 'N/A',
                                category: category
                            };
                        });

                        // Filter by status (case insensitive and trimming)
                        setActiveTickets(tickets.filter(t => {
                            const s = t.status.toLowerCase().trim();
                            return s !== 'resolved' && s !== 'resolu' && s !== 'résolu';
                        }));
                        setResolvedTickets(tickets.filter(t => {
                            const s = t.status.toLowerCase().trim();
                            return s === 'resolved' || s === 'resolu' || s === 'résolu';
                        }));
                    } else {
                        setActiveTickets([]);
                        setResolvedTickets([]);
                    }
                } else {
                    // Error fetching tickets, but not an unexpected error
                }
            } catch (error) {
                console.error('Unexpected error in fetchTickets:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTickets().catch(err => console.error(err));
    }, [context]);

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
                        <h3>Your Active Tickets {isLoading && '(Loading...)'}</h3>
                        {!isLoading && activeTickets.length === 0 && <p>No active tickets found.</p>}
                        {activeTickets.map(ticket => {
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
                        <h3>Resolved Recently {isLoading && '(Loading...)'}</h3>
                        {!isLoading && resolvedTickets.length === 0 && <p>No resolved tickets found.</p>}
                        {resolvedTickets.map(ticket => (
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
