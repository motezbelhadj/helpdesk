import * as React from 'react';
import { useState, useEffect } from 'react';
import styles from './AdminDashboard.module.scss';
import { escape } from '@microsoft/sp-lodash-subset';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import { ITicket } from '../MockData';

export interface IAdminDashboardProps {
  userDisplayName: string;
  isDarkTheme: boolean;
  context: WebPartContext;
  onNavigateBack: () => void;
  onNavigateToTickets: () => void;
  onNavigateToUsers: () => void;
}

export const AdminDashboard: React.FC<IAdminDashboardProps> = (props) => {
  const { userDisplayName, isDarkTheme, onNavigateBack, context } = props;
  const [tickets, setTickets] = useState<ITicket[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAllTickets = async (): Promise<void> => {
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

              return {
                id: reference,
                title: item.Title || item.Titre || 'Untitled',
                status: status as any,
                date: item.Created ? new Date(item.Created).toLocaleDateString() : 'N/A',
                category: category
              };
            });
            setTickets(fetchedTickets);
          }
        }
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllTickets().catch(err => console.error(err));
  }, [context]);

  // Calculations
  const totalOpen = tickets.filter(t => {
    const s = t.status.toLowerCase().trim();
    return s !== 'resolved' && s !== 'resolu' && s !== 'résolu';
  }).length;

  const totalResolved = tickets.filter(t => {
    const s = t.status.toLowerCase().trim();
    return s === 'resolved' || s === 'resolu' || s === 'résolu';
  }).length;

  // Mocked for now as we don't have assignment data in the current ITicket interface
  const unassignedTickets = tickets.filter(t => t.status.toLowerCase() === 'pending').length;

  // Categories distribution
  const categories: {[key: string]: number} = {};
  tickets.forEach(t => {
    categories[t.category] = (categories[t.category] || 0) + 1;
  });

  // Priority distribution (Mocked since Priority field isn't in ITicket yet, using Status as proxy or just showing the logic)
  const highPriority = Math.round(tickets.length * 0.2); // Placeholder logic
  const medPriority = Math.round(tickets.length * 0.5);
  const lowPriority = tickets.length - highPriority - medPriority;

  return (
    <div className={`${styles.adminDashboard} ${isDarkTheme ? styles.dark : ''}`}>
        <header className={styles.header}>
            <div className={styles.headerLeft}>
                <h2>Admin Dashboard</h2>
                <p>Welcome back, {escape(userDisplayName)}. Here's an overview of the system {isLoading && '(Loading...)'}</p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
                <button className={styles.backButton} style={{ border: '2px solid var(--brand-accent-blue)', color: 'var(--brand-accent-blue)' }} onClick={props.onNavigateToUsers}>
                    User Management
                </button>
                <button className={styles.backButton} onClick={onNavigateBack}>
                    Switch to User View
                </button>
            </div>
        </header>

        {/* KPI Cards */}
        <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
                <div className={styles.kpiValue}>{totalOpen}</div>
                <div className={styles.kpiLabel}>Total Open Tickets</div>
            </div>
            <div className={styles.kpiCard}>
                <div className={styles.kpiValue}>{totalResolved}</div>
                <div className={styles.kpiLabel}>Total Resolved</div>
            </div>
            <div className={styles.kpiCard}>
                <div className={styles.kpiValue}>2.4h</div>
                <div className={styles.kpiLabel}>Avg Resolution Time</div>
            </div>
            <div className={styles.kpiCard}>
                <div className={`${styles.kpiValue} ${styles.warningText}`}>{unassignedTickets}</div>
                <div className={styles.kpiLabel}>Pending Tickets</div>
            </div>
        </div>

        <div className={styles.dashboardGrid}>
            {/* Charts Area */}
            <div className={styles.mainContent}>
                <div className={styles.card}>
                    <h3>Ticket Volume Trend</h3>
                    <div className={styles.chartMetric}>Showing Real-time distribution by Category</div>
                    <div className={styles.chartPlaceholder}>
                        <div className={styles.placeholderBars}>
                            {Object.keys(categories).slice(0, 7).map(cat => {
                                const percentage = (categories[cat] / tickets.length) * 100 || 0;
                                return (
                                    <div key={cat} className={styles.barContainer} title={`${cat}: ${categories[cat]}`}>
                                        <div className={styles.bar} style={{ height: `${Math.max(percentage, 5)}%` }}></div>
                                        <span style={{ fontSize: '0.7em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '40px' }}>{cat}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className={styles.chartsRow}>
                     <div className={styles.card}>
                        <h3>Tickets by Category</h3>
                        <div className={styles.donutChartPlaceholder}>
                            <div className={styles.donutCenter}>{tickets.length} total</div>
                        </div>
                        <div className={styles.chartLegend}>
                            {Object.keys(categories).slice(0, 3).map((cat, i) => (
                                <span key={cat} className={styles.legendItem}>
                                    <span style={{backgroundColor: i === 0 ? '#223445' : i === 1 ? '#F58220' : '#107c10'}}></span> 
                                    {cat} ({Math.round((categories[cat] / tickets.length) * 100) || 0}%)
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className={styles.card}>
                        <h3>Priority Distribution (Proxy)</h3>
                         <div className={styles.statsList}>
                             <div className={styles.statItem}>
                                 <div className={styles.statLabel}>High</div>
                                 <div className={styles.statBarWrapper}>
                                    <div className={styles.statBar} style={{width: `${(highPriority/tickets.length)*100}%`, backgroundColor: '#d13438'}}></div>
                                 </div>
                                 <div className={styles.statValue}>{highPriority}</div>
                             </div>
                             <div className={styles.statItem}>
                                 <div className={styles.statLabel}>Medium</div>
                                 <div className={styles.statBarWrapper}>
                                    <div className={styles.statBar} style={{width: `${(medPriority/tickets.length)*100}%`, backgroundColor: '#f58220'}}></div>
                                 </div>
                                 <div className={styles.statValue}>{medPriority}</div>
                             </div>
                             <div className={styles.statItem}>
                                 <div className={styles.statLabel}>Low</div>
                                 <div className={styles.statBarWrapper}>
                                    <div className={styles.statBar} style={{width: `${(lowPriority/tickets.length)*100}%`, backgroundColor: '#107c10'}}></div>
                                 </div>
                                 <div className={styles.statValue}>{lowPriority}</div>
                             </div>
                         </div>
                    </div>
                </div>
            </div>

            {/* Sidebar / Activity Feed */}
            <div className={styles.sidebar}>
                <div className={styles.card}>
                    <h3>Recent Tickets</h3>
                    <div className={styles.activityFeed}>
                        {tickets.slice(0, 5).map(ticket => (
                            <div key={ticket.id} className={styles.activityItem}>
                                <div className={`${styles.activityDot} ${ticket.status.toLowerCase().indexOf('resol') !== -1 ? styles.success : ''}`}></div>
                                <div className={styles.activityContent}>
                                    <strong>{ticket.id}</strong>: {ticket.title}
                                    <div className={styles.activityTime}>{ticket.date} • {ticket.category}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                     <button className={styles.viewAllButton} onClick={props.onNavigateToTickets}>View All Tickets</button>
                </div>
            </div>
        </div>

    </div>
  );
};
