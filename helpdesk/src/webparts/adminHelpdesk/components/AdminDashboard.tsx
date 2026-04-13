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
  const [iframeLoading, setIframeLoading] = useState<boolean>(true);
  const [showAuthHelper, setShowAuthHelper] = useState<boolean>(false);
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

    // Show auth troubleshooting after 7 seconds if still loading
    const timer = setTimeout(() => {
      setShowAuthHelper(true);
    }, 7000);

    return () => clearTimeout(timer);
  }, []);

  // Calculations
  const totalOpen = tickets.filter(t => (t.Status || t.Statut) !== 'Resolved').length;
  const totalResolved = tickets.filter(t => (t.Status || t.Statut) === 'Resolved').length;
  const pendingTickets = tickets.filter(t => (t.Status || t.Statut) === 'New' || (t.Status || t.Statut) === 'Pending').length;


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

                {/* Power BI Embedded Report Section */}
                {powerBIReportUrl ? (
                    <div className={styles.card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h3>Live Analytics</h3>
                                <div className={styles.liveIndicator}>
                                    <span className={styles.liveDot}></span>
                                    Live Sync
                                </div>
                            </div>
                            <button 
                                className={styles.refreshBtn} 
                                onClick={() => {
                                    const iframe = document.getElementById('pbi-iframe') as HTMLIFrameElement;
                                    if (iframe) iframe.src = iframe.src;
                                }}
                                title="Refresh Report"
                            >
                                <Icon iconName="Refresh" />
                            </button>
                        </div>
                        
                        <div className={styles.powerBIWrapper}>
                            {iframeLoading && (
                                <div className={styles.pbiSkeleton}>
                                    <div className={styles.skeletonHeader}></div>
                                    <div className={styles.skeletonGrid}>
                                        <div className={styles.skeletonCard}></div>
                                        <div className={styles.skeletonCard}></div>
                                        <div className={styles.skeletonChart}></div>
                                    </div>
                                    <div className={styles.pbiLoader}>
                                        <Icon iconName="PowerBILogo" />
                                        <p>Connecting to Power BI Service...</p>
                                    </div>
                                </div>
                            )}
                            
                            <div className={styles.powerBIContainer} style={{ opacity: iframeLoading ? 0 : 1, position: iframeLoading ? 'absolute' : 'relative', width: '100%' }}>
                                <iframe
                                    id="pbi-iframe"
                                    title="Power BI Report"
                                    width="100%"
                                    height="600"
                                    src={powerBIReportUrl}
                                    frameBorder="0"
                                    allowFullScreen={true}
                                    allow="fullscreen; geolocation; microphone; camera; display-capture; encrypted-media;"
                                    onLoad={() => setIframeLoading(false)}
                                ></iframe>
                            </div>

                            {showAuthHelper && iframeLoading && (
                                <div className={styles.authHelper}>
                                    <Icon iconName="Info" />
                                    <p>
                                        Stuck on the Power BI logo? 
                                        <a href="https://app.powerbi.com" target="_blank" rel="noopener noreferrer"> Click here to sign in</a> and then refresh this page.
                                    </p>
                                </div>
                            )}
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
