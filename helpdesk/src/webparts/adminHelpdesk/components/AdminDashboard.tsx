import * as React from 'react';
import { useState, useEffect } from 'react';
import styles from './AdminDashboard.module.scss';
import { escape } from '@microsoft/sp-lodash-subset';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { Icon } from '@fluentui/react';
import { SPService } from '../../../services/SPService';

/**
 * Properties for the AdminDashboard component.
 */
export interface IAdminDashboardProps {
  userDisplayName: string;       // The display name of the current admin user
  isDarkTheme: boolean;          // Whether the dark theme is active
  context: WebPartContext;       // SharePoint context
  onNavigateBack: () => void;    // Callback to return to the user portal
  onNavigateToTickets: () => void; // Callback to navigate to ticket management
  onNavigateToUsers: () => void;  // Callback to navigate to user management
  powerBIReportUrl?: string;     // Optional URL for an embedded Power BI report
}

/**
 * AdminDashboard Component
 * 
 * Provides an administrative overview of the helpdesk system, including
 * high-level metrics, ticket distributions, and navigation to management tools.
 */
export const AdminDashboard: React.FC<IAdminDashboardProps> = (props) => {
  const { userDisplayName, isDarkTheme, onNavigateBack, context, powerBIReportUrl } = props;
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const spService = new SPService(context);

  useEffect(() => {
    const fetchAllTickets = async (): Promise<void> => {
      setIsLoading(true);
      try {
        const fetchedTickets = await spService.getAllTickets();
        setTickets(fetchedTickets);
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllTickets().catch(err => console.error(err));
  }, []);

  // Calculations
  const totalOpen = tickets.filter(t => (t.Status || t.Statut) !== 'Resolved').length;
  const totalResolved = tickets.filter(t => (t.Status || t.Statut) === 'Resolved').length;
  const pendingTickets = tickets.filter(t => (t.Status || t.Statut) === 'New' || (t.Status || t.Statut) === 'Pending').length;

  const highPriority = tickets.filter(t => t.Priority === 'High' || t.Priorite === 'Haute').length;
  const medPriority = tickets.filter(t => t.Priority === 'Medium' || t.Priorite === 'Moyenne').length;
  const lowPriority = tickets.filter(t => t.Priority === 'Low' || t.Priorite === 'Basse').length;

  const categories: {[key: string]: number} = {};
  tickets.forEach(t => {
    const cat = t.Categorie || t.Category || 'Autre';
    categories[cat] = (categories[cat] || 0) + 1;
  });

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
                    User Portal
                </button>
            </div>
        </header>

        {/* KPI Cards */}
        <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
                <div className={styles.kpiValue}>{totalOpen}</div>
                <div className={styles.kpiLabel}>Open Tickets</div>
            </div>
            <div className={styles.kpiCard}>
                <div className={styles.kpiValue}>{totalResolved}</div>
                <div className={styles.kpiLabel}>Resolved Tickets</div>
            </div>
            <div className={styles.kpiCard}>
                <div className={styles.kpiValue}>2.4h</div>
                <div className={styles.kpiLabel}>Avg Resolution Time</div>
            </div>
            <div className={styles.kpiCard}>
                <div className={`${styles.kpiValue} ${styles.warningText}`}>{pendingTickets}</div>
                <div className={styles.kpiLabel}>Pending Tickets</div>
            </div>
        </div>

        <div className={styles.dashboardGrid}>
            <div className={styles.mainContent}>
                <div className={styles.card}>
                    <h3>Trends by Category</h3>
                    <div className={styles.chartMetric}>Real-time distribution</div>
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
                        <h3>Priority Distribution</h3>
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

                {/* Power BI Embedded Report Section */}
                {powerBIReportUrl ? (
                    <div className={styles.card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3>Live Power BI Report</h3>
                            <span style={{ fontSize: '0.8em', color: 'var(--text-secondary)' }}>Live Sync Enabled</span>
                        </div>
                        <div className={styles.powerBIContainer}>
                            <iframe
                                title="Power BI Report"
                                width="100%"
                                height="600"
                                src={powerBIReportUrl}
                                frameBorder="0"
                                allowFullScreen={true}
                            ></iframe>
                        </div>
                    </div>
                ) : (
                    <div className={`${styles.card} ${styles.powerBICard}`}>
                        <div className={styles.powerBIContent}>
                            <div className={styles.powerBIIcon}>
                                <Icon iconName="PowerBILogo" />
                            </div>
                            <div className={styles.powerBIText}>
                                <h4>Advanced Analytics with Power BI</h4>
                                <p>For deeper insights, connect your SharePoint lists to Power BI and paste the URL here.</p>
                            </div>
                            <button className={styles.learnMoreBtn} onClick={() => window.open('https://powerbi.microsoft.com/', '_blank')}>
                                Learn More
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className={styles.sidebar}>
                <div className={styles.card}>
                    <h3>Recent Tickets</h3>
                    <div className={styles.activityFeed}>
                        {tickets.slice(0, 5).map(ticket => (
                            <div key={ticket.Id} className={styles.activityItem}>
                                <div className={`${styles.activityDot} ${(ticket.Status || '').toLowerCase().indexOf('resol') !== -1 ? styles.success : ''}`}></div>
                                <div className={styles.activityContent}>
                                    <strong>{ticket.Reference || `TK-${ticket.Id}`}</strong>: {ticket.Title}
                                    <div className={styles.activityTime}>{ticket.Created ? new Date(ticket.Created).toLocaleDateString() : 'N/A'} • {ticket.Categorie || 'Other'}</div>
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
