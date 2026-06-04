import * as React from 'react';
import { useState, useEffect } from 'react';
import styles from './Dashboard.module.scss';
import { ITicket } from '../MockData';
import { escape } from '@microsoft/sp-lodash-subset';
import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { Icon } from '@fluentui/react';
import { SPService } from '../../../services/SPService';
import { UserTicketDetails } from './UserTicketDetails';
import { SLACountdown } from './SLACountdown';
import { TicketForm } from './TicketForm';
import { UserProfile } from './UserProfile';

/**
 * Properties for the HelpdeskDashboard component.
 */
export interface IDashboardProps {
    userDisplayName: string;        // The display name of the current user
    userEmail: string;              // The email of the current user
    isDarkTheme: boolean;           // Whether the dark theme is active
    context: WebPartContext;        // SharePoint context
    spService: SPService;           // Service for SharePoint operations
    onNavigateToAdmin?: () => void; // Optional callback for admin navigation
    onNavigateToAgent?: () => void; // Optional callback for agent navigation
    onNavigateToAgentAI?: (searchText?: string) => void; // Optional callback for Agent AI navigation
    onNewTicket?: () => void;       // Optional callback to open new ticket form
    onNavigateToProfile?: () => void; // Optional callback to open user profile
    initialView?: 'dashboard' | 'new-ticket' | 'profile'; // Initial view to display
}

/**
 * Interface for a ticket-related notification.
 */
export interface ITicketNotification {
    id: string;             // Unique ID for the notification
    ticketId: string | number;
    type: 'status' | 'message' | 'upload';
    title: string;
    message: string;
    date: string;
    rawDate: Date;
    isRead: boolean;
}

/**
 * HelpdeskDashboard Component
 * 
 * Displays the user's helpdesk overview, including active tickets, 
 * resolved tickets, system status, and quick action buttons.
 */
export const HelpdeskDashboard: React.FC<IDashboardProps> = (props) => {
    const { userDisplayName, isDarkTheme, context, onNavigateToAdmin, onNavigateToAgent, onNavigateToAgentAI, spService } = props;
    const [activeTickets, setActiveTickets] = useState<ITicket[]>([]);
    const [resolvedTickets, setResolvedTickets] = useState<ITicket[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [userRole, setUserRole] = useState<'Admin' | 'Agent' | 'User' | null>(null);
    const [selectedTicketId, setSelectedTicketId] = useState<string | number | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [pendingAgentTicketsCount, setPendingAgentTicketsCount] = useState<number>(0);

    const [activeView, setActiveView] = useState<'dashboard' | 'new-ticket' | 'profile'>(props.initialView || 'dashboard');

    useEffect(() => {
        if (props.initialView) {
            setActiveView(props.initialView);
        }
    }, [props.initialView]);

    useEffect(() => {
        const fetchTickets = async (): Promise<void> => {
            setIsLoading(true);
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const user = await spService._sp.web.currentUser();
                // Fetch only items created by the current user
                const listUrl = `${context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('ticket')/items?$filter=AuthorId eq ${user.Id}`;
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
                                spId: item.Id,
                                title: item.Title || item.Titre || 'Untitled',
                                status: status as 'Pending' | 'In Progress' | 'Resolved', // Use known statuses
                                date: item.Created ? new Date(item.Created).toLocaleDateString() : 'N/A',
                                category: category,
                                priority: item.Priorite || item.Priority || 'Normal',
                                dueDate: item.DueDate ? new Date(item.DueDate) : spService.calculateDeadline(new Date(item.Created), item.Priorite || 'Normal')
                            };
                        });

                        setActiveTickets(tickets.filter(t => {
                            const s = t.status.toLowerCase().trim();
                            return s !== 'resolved' && s !== 'resolu' && s !== 'résolu';
                        }));
                        setResolvedTickets(tickets.filter(t => {
                            const s = t.status.toLowerCase().trim();
                            return s === 'resolved' || s === 'resolu' || s === 'résolu';
                        }));

                        // Notifications are now handled by the global Application Customizer extension
                    }
                }
            } catch (error) {
                console.error('Error fetching tickets:', error);
            } finally {
                setIsLoading(false);
            }
        };

        const checkRole = async (): Promise<void> => {
            const role = await spService.getCurrentUserRole();
            setUserRole(role);
            if (role === 'Agent') {
                try {
                    const userProfile = await spService.getCurrentUserProfile();
                    if (userProfile && userProfile.Id) {
                        const tickets = await spService.getAgentTickets(userProfile.Id);
                        const pendingCount = tickets.filter((t: any) => {
                            const s = (t.Status || t.Statut || t.status || 'Pending').toLowerCase().trim();
                            return s === 'pending' || s === 'nouveau';
                        }).length;
                        setPendingAgentTicketsCount(pendingCount);
                    }
                } catch (e) {
                    console.error('Error fetching agent tickets for badge', e);
                }
            }
        };

        checkRole().catch(err => console.error(err));
        fetchTickets().catch(err => console.error(err));
    }, [context, refreshKey]);

    if (selectedTicketId) {
        return <UserTicketDetails 
            ticketId={selectedTicketId} 
            onBack={() => { setSelectedTicketId(null); setRefreshKey(k => k + 1); }} 
            spService={spService} 
        />;
    }

    return (
        <div className={`${styles.helpdeskDashboard} ${isDarkTheme ? styles.dark : ''}`}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.brandLogo}>HelpDesk Pro</div>
                
                <div className={styles.navGroup}>
                    <div className={`${styles.navItem} ${activeView === 'dashboard' ? styles.active : ''}`} onClick={() => setActiveView('dashboard')}>
                        <Icon iconName="ViewDashboard" />
                        <span>Dashboard</span>
                    </div>
                    <div className={`${styles.navItem} ${activeView === 'new-ticket' ? styles.active : ''}`} onClick={() => setActiveView('new-ticket')}>
                        <Icon iconName="Add" />
                        <span>New Ticket</span>
                    </div>
                    <div className={`${styles.navItem} ${activeView === 'profile' ? styles.active : ''}`} onClick={() => setActiveView('profile')}>
                        <Icon iconName="Contact" />
                        <span>My Profile</span>
                    </div>
                    {onNavigateToAgentAI && (
                        <div className={styles.navItem} onClick={() => onNavigateToAgentAI()}>
                            <Icon iconName="Robot" />
                            <span>Agent AI</span>
                        </div>
                    )}
                    
                    {/* Role-based conditional links */}
                    {userRole === 'Agent' && onNavigateToAgent && (
                        <div className={styles.navItem} onClick={onNavigateToAgent}>
                            <Icon iconName="Headset" />
                            <span>Agent Human</span>
                            {pendingAgentTicketsCount > 0 && (
                                <div style={{
                                    marginLeft: 'auto', background: '#ef4444', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold'
                                }}>
                                    {pendingAgentTicketsCount > 99 ? '99+' : pendingAgentTicketsCount}
                                </div>
                            )}
                        </div>
                    )}

                    {userRole === 'Admin' && onNavigateToAdmin && (
                        <div className={styles.navItem} onClick={onNavigateToAdmin}>
                            <Icon iconName="Settings" />
                            <span>Admin Panel</span>
                        </div>
                    )}
                </div>


            </aside>

            {/* Main Content Area */}
            <main className={styles.mainContent}>
                {/* Top Header */}
                <header className={styles.topHeader}>
                    <div className={styles.topNavLinks}>
                        <div className={`${styles.topNavLink} ${styles.active}`}>Dashboard</div>
                        <div className={styles.topNavLink} onClick={() => document.getElementById('active-tickets-section')?.scrollIntoView({ behavior: 'smooth' })} style={{ cursor: 'pointer' }}>My Tickets</div>

                    </div>
                    
                    <div className={styles.headerIcons}>
                        {/* Notification bell moved to global SharePoint header extension */}
                    </div>
                </header>

                <div className={styles.contentWrapper}>
                    {activeView === 'dashboard' && (
                    <>
                    {/* Hero Section */}
                    <section className={styles.heroSection}>
                        <h1>Hello, {escape(userDisplayName)}</h1>
                        <p style={{ margin: 0 }}>Welcome to our HelpDesk</p>
                    </section>

                    {/* Quick Actions (Full Width) */}
                    <div className={styles.sectionBlock} style={{ marginBottom: '24px' }}>
                        <div className={styles.sectionHeader}>Quick Actions</div>
                        <div className={styles.quickActionsGrid}>
                            {userRole === 'Admin' && onNavigateToAdmin && (
                                <div className={styles.quickActionCard} onClick={onNavigateToAdmin}>
                                    <Icon iconName="Settings" />
                                    <span>Admin Panel</span>
                                </div>
                            )}
                            {userRole === 'Agent' && onNavigateToAgent && (
                                <div className={styles.quickActionCard} onClick={onNavigateToAgent} style={{ position: 'relative' }}>
                                    {pendingAgentTicketsCount > 0 && (
                                        <div style={{
                                            position: 'absolute', top: '4px', right: '4px', background: '#ef4444', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold'
                                        }}>
                                            {pendingAgentTicketsCount > 99 ? '99+' : pendingAgentTicketsCount}
                                        </div>
                                    )}
                                    <Icon iconName="Headset" />
                                    <span>Agent Human</span>
                                </div>
                            )}
                            <div className={styles.quickActionCard} onClick={() => setActiveView('new-ticket')}>
                                <Icon iconName="Add" />
                                <span>New Ticket</span>
                            </div>
                            <div className={styles.quickActionCard} onClick={() => setActiveView('profile')}>
                                <Icon iconName="Contact" />
                                <span>My Profile</span>
                            </div>
                            {onNavigateToAgentAI && (
                                <div className={styles.quickActionCard} onClick={() => onNavigateToAgentAI()}>
                                    <Icon iconName="Robot" />
                                    <span>Agent AI</span>
                                </div>
                            )}
                            <div className={styles.quickActionCard}>
                                <Icon iconName="Help" />
                                <span>Common Fixes</span>
                            </div>
                        </div>
                    </div>

                    {/* Dashboard Grid */}
                    <div className={styles.dashboardGrid}>
                        <div className={styles.leftColumn}>


                            {/* Active Tickets */}
                            <div className={styles.sectionBlock} id="active-tickets-section">
                                <div className={styles.sectionHeader}>Your Active Tickets</div>
                                {isLoading && <p>Loading...</p>}
                                {!isLoading && activeTickets.length === 0 && <p>No active tickets found.</p>}
                                <div className={styles.ticketList}>
                                    {activeTickets.map(ticket => {
                                        const tStatus = ticket.status.toLowerCase().trim();
                                        let badgeClass = styles.pending;
                                        if (tStatus === 'in progress') badgeClass = styles.inProgress;
                                        else if (tStatus.indexOf('awaiting') > -1) badgeClass = styles.awaitingFeedback;
                                        else if (tStatus === 'nouveau' || tStatus === 'new') badgeClass = styles.new;
                                        
                                        const isOverdue = ticket.dueDate && (ticket.dueDate.getTime() < new Date().getTime());

                                        return (
                                            <div key={ticket.id} className={styles.ticketItem} onClick={() => setSelectedTicketId(ticket.spId || ticket.id)}>
                                                <div className={styles.ticketInfo}>
                                                    <div className={styles.ticketTitle}>
                                                        <strong>{ticket.id}:</strong> {ticket.title}
                                                    </div>
                                                    <div className={styles.ticketMeta}>
                                                        {ticket.category} • Created {ticket.date}
                                                    </div>
                                                </div>
                                                <div className={styles.ticketBadges}>
                                                    <span className={`${styles.statusBadge} ${badgeClass}`}>{ticket.status}</span>
                                                    {isOverdue && (
                                                        <span className={styles.overdueBadge}>
                                                            <Icon iconName="Clock" />
                                                            Overdue by {Math.floor((new Date().getTime() - ticket.dueDate!.getTime()) / (1000 * 60 * 60 * 24))}d {Math.floor(((new Date().getTime() - ticket.dueDate!.getTime()) / (1000 * 60 * 60)) % 24)}h
                                                        </span>
                                                    )}
                                                    {!isOverdue && ticket.dueDate && (
                                                        <SLACountdown targetDate={ticket.dueDate} isResolved={false} />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className={styles.rightColumn}>


                            {/* Resolved Recently */}
                            <div className={styles.sectionBlock}>
                                <div className={styles.sectionHeader}>Resolved Recently</div>
                                {isLoading && <p>Loading...</p>}
                                {!isLoading && resolvedTickets.length === 0 && <p>No resolved tickets found.</p>}
                                <div className={styles.ticketList}>
                                    {resolvedTickets.map(ticket => (
                                        <div key={ticket.id} className={`${styles.ticketItem} ${styles.resolvedStyle}`} onClick={() => setSelectedTicketId(ticket.spId || ticket.id)}>
                                            <div className={styles.ticketInfo}>
                                                <div className={styles.ticketTitle}>
                                                    <strong>{ticket.id}:</strong> {ticket.title}
                                                </div>
                                                <div className={styles.ticketMeta}>
                                                    {ticket.category} • Resolved {ticket.date}
                                                </div>
                                            </div>
                                            <div className={styles.ticketBadges}>
                                                <span className={`${styles.statusBadge} ${styles.resolved}`}>Resolved</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    </>
                    )}

                    {activeView === 'new-ticket' && (
                        <TicketForm 
                            spService={spService}
                            currentUserDisplayName={userDisplayName}
                            onClose={() => setActiveView('dashboard')}
                        />
                    )}

                    {activeView === 'profile' && (
                        <UserProfile
                            userDisplayName={userDisplayName}
                            userEmail={props.userEmail}
                            isDarkTheme={isDarkTheme}
                            spService={spService}
                            onBack={() => setActiveView('dashboard')}
                        />
                    )}
                </div>
            </main>

            <button className={styles.fabButton} onClick={() => setActiveView('new-ticket')} title="New Ticket">
                <Icon iconName="Add" />
            </button>

            {/* Notifications are now handled by the global Application Customizer header extension */}
        </div>
    );
};
