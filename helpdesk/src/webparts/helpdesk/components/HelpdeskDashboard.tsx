import * as React from 'react';
import { useState, useEffect } from 'react';
import styles from './Dashboard.module.scss';
import { ITicket, MOCK_ANNOUNCEMENTS } from '../MockData';
import { escape } from '@microsoft/sp-lodash-subset';
import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { Icon } from '@fluentui/react';
import { SPService } from '../../../services/SPService';
import { UserTicketDetails } from './UserTicketDetails';
import { SLACountdown } from './SLACountdown';

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
    const { userDisplayName, isDarkTheme, context, onNavigateToAdmin, onNavigateToAgent, onNavigateToAgentAI, onNewTicket, onNavigateToProfile, spService } = props;
    const [activeTickets, setActiveTickets] = useState<ITicket[]>([]);
    const [resolvedTickets, setResolvedTickets] = useState<ITicket[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [userRole, setUserRole] = useState<'Admin' | 'Agent' | 'User' | null>(null);
    const [selectedTicketId, setSelectedTicketId] = useState<string | number | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [pendingAgentTicketsCount, setPendingAgentTicketsCount] = useState<number>(0);
    const [hasNotifications, setHasNotifications] = useState<boolean>(false);
    const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState<boolean>(false);
    const [notifications, setNotifications] = useState<ITicketNotification[]>([]);

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

                        // Logic for the red notification point: 
                        // We will call a separate function to calculate notifications
                        // including status changes and new messages.
                        await calculateNotifications(data.value, user.Id);
                    }
                }
            } catch (error) {
                console.error('Error fetching tickets:', error);
            } finally {
                setIsLoading(false);
            }
        };

        const calculateNotifications = async (rawTickets: any[], currentUserId: number): Promise<void> => {
            const newNotifications: ITicketNotification[] = [];
            const seenStatusKey = `helpdesk_seen_status_${currentUserId}`;
            const seenCommentsKey = `helpdesk_seen_comments_${currentUserId}`;
            
            const seenStatus = JSON.parse(localStorage.getItem(seenStatusKey) || '{}');
            const seenComments = JSON.parse(localStorage.getItem(seenCommentsKey) || '{}');
            
            for (const item of rawTickets) {
                const ticketId = item.Id;
                const reference = item.Reference || `TK-${item.Id}`;
                const currentStatus = item.Statut || item.Status || 'Pending';
                
                // 1. Check for Status Change
                // If the status is not Pending/Nouveau and it's different from what we last saw
                if (currentStatus.toLowerCase() !== 'pending' && currentStatus.toLowerCase() !== 'nouveau') {
                    if (seenStatus[ticketId] !== currentStatus) {
                        newNotifications.push({
                            id: `status_${ticketId}_${currentStatus}`,
                            ticketId: reference,
                            type: 'status',
                            title: `Status Updated: ${reference}`,
                            message: `Your ticket status is now "${currentStatus}".`,
                            date: new Date(item.Modified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            rawDate: new Date(item.Modified),
                            isRead: false
                        });
                    }
                }

                // 2. Check for New Messages
                try {
                    const comments = await spService.getComments(ticketId);
                    if (comments.length > 0) {
                        const lastComment = comments[comments.length - 1];
                        // If last comment is NOT from current user and we haven't seen this comment ID yet
                        if (lastComment.Author?.Title !== props.userDisplayName && seenComments[ticketId] !== lastComment.Id) {
                            newNotifications.push({
                                id: `msg_${ticketId}_${lastComment.Id}`,
                                ticketId: reference,
                                type: 'message',
                                title: `New Message: ${reference}`,
                                message: lastComment.Commentaire || lastComment.Text || 'New message from agent.',
                                date: new Date(lastComment.Created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                rawDate: new Date(lastComment.Created),
                                isRead: false
                            });
                        }
                    }
                } catch (e) {
                    console.warn(`Could not check comments for ticket ${ticketId}`, e);
                }

                // 3. Check for Overdue
                const priority = item.Priorite || 'Normal';
                const deadline = item.DueDate ? new Date(item.DueDate) : spService.calculateDeadline(new Date(item.Created), priority);
                const isOverdue = deadline.getTime() < new Date().getTime() && currentStatus.toLowerCase() !== 'resolved';
                
                const seenOverdueKey = `helpdesk_seen_overdue_${currentUserId}`;
                const seenOverdue = JSON.parse(localStorage.getItem(seenOverdueKey) || '{}');

                if (isOverdue && !seenOverdue[ticketId]) {
                    newNotifications.push({
                        id: `overdue_${ticketId}`,
                        ticketId: reference,
                        type: 'status',
                        title: `TICKET OVERDUE: ${reference}`,
                        message: `The SLA deadline for this ticket has passed.`,
                        date: deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        rawDate: deadline,
                        isRead: false
                    });
                }
                
                // 4. Check for Approaching Deadline (less than 4 hours remaining)
                const timeRemainingMs = deadline.getTime() - new Date().getTime();
                const isApproaching = timeRemainingMs > 0 && timeRemainingMs < (4 * 60 * 60 * 1000) && currentStatus.toLowerCase() !== 'resolved';

                const seenApproachingKey = `helpdesk_seen_approaching_${currentUserId}`;
                const seenApproaching = JSON.parse(localStorage.getItem(seenApproachingKey) || '{}');

                if (isApproaching && !seenApproaching[ticketId]) {
                    newNotifications.push({
                        id: `approaching_${ticketId}`,
                        ticketId: reference,
                        type: 'status',
                        title: `DEADLINE APPROACHING: ${reference}`,
                        message: `This ticket is due in less than 4 hours!`,
                        date: deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        rawDate: deadline,
                        isRead: false
                    });
                }
            }

            // Sort by date descending
            newNotifications.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
            setNotifications(newNotifications);
            setHasNotifications(newNotifications.length > 0);
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
            {/* 1. Smart Search & Instant Resolution */}
            <header className={styles.searchHeader}>
                <div className={styles.notificationWrapper}>
                    <div 
                        className={styles.notificationButton} 
                        title="Notifications"
                        onClick={() => setIsNotificationPanelOpen(true)}
                    >
                        <Icon iconName="Ringer" />
                        {hasNotifications && <div className={styles.notificationBadge}></div>}
                    </div>
                </div>
                <h1>Hello, {escape(userDisplayName)}</h1>
                <p>How can we help you today?</p>
                <div className={styles.searchInputWrapper}>
                    <input 
                        type="text" 
                        placeholder="Describe your issue (e.g., 'I can't access my email')..." 
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && onNavigateToAgentAI) {
                                onNavigateToAgentAI((e.target as HTMLInputElement).value);
                            }
                        }}
                    />
                </div>
            </header>

            <div className={styles.grid}>
                <div className={styles.leftColumn}>
                    {/* 2. Request Hub */}
                    <section className={styles.section}>
                        <div className={styles.glassCard}>
                            <h3>Quick Actions</h3>
                            <div className={styles.quickActions}>
                                {userRole === 'Admin' && onNavigateToAdmin && (
                                    <div className={styles.actionButton} onClick={onNavigateToAdmin}>
                                        <span>⚙️</span>
                                        <div>Admin Panel</div>
                                    </div>
                                )}
                                {userRole === 'Agent' && onNavigateToAgent && (
                                    <div className={styles.actionButton} onClick={onNavigateToAgent} style={{ borderColor: '#f58220', backgroundColor: '#fffaf5', position: 'relative' }}>
                                        {pendingAgentTicketsCount > 0 && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '-8px',
                                                right: '-8px',
                                                backgroundColor: '#ef4444',
                                                color: 'white',
                                                borderRadius: '50%',
                                                width: '24px',
                                                height: '24px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.8rem',
                                                fontWeight: 'bold',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                            }}>
                                                {pendingAgentTicketsCount > 99 ? '99+' : pendingAgentTicketsCount}
                                            </div>
                                        )}
                                        <Icon iconName="Headset" style={{ color: '#f58220', fontSize: '32px' }} />
                                        <div style={{ color: '#f58220', fontWeight: 'bold' }}>Agent Human</div>
                                    </div>
                                )}
                                <div className={styles.actionButton} onClick={onNewTicket}>
                                    <span>➕</span>
                                    <div>New Ticket</div>
                                </div>
                                <div className={styles.actionButton} onClick={onNavigateToProfile}>
                                    <span>👤</span>
                                    <div>My Profile</div>
                                </div>
                                {onNavigateToAgentAI && (
                                    <div className={styles.actionButton} onClick={() => onNavigateToAgentAI && onNavigateToAgentAI()}>
                                        <span>🤖</span>
                                        <div>Agent AI</div>
                                    </div>
                                )}
                                <div className={styles.actionButton}>
                                    <span>❓</span>
                                    <div>Common Fixes</div>
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
                                <div key={ticket.id} className={`${styles.statusCard} ${statusStyle}`} onClick={() => setSelectedTicketId(ticket.id)} style={{ cursor: 'pointer', position: 'relative' }}>
                                    <div style={{ flex: 1, marginRight: '10px' }}>
                                        <strong>{ticket.id}</strong>: {ticket.title}
                                        <div style={{ fontSize: '0.8em', color: '#605e5c' }}>{ticket.category} • Created {ticket.date}</div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                        <span className={styles.badge}>{ticket.status}</span>
                                        {ticket.status.toLowerCase() !== 'resolved' && ticket.dueDate && (
                                            <SLACountdown targetDate={ticket.dueDate} isResolved={false} />
                                        )}
                                    </div>
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
                            <div key={ticket.id} className={styles.statusCard} style={{ borderLeftColor: '#107c10', opacity: 0.8, cursor: 'pointer' }} onClick={() => setSelectedTicketId(ticket.id)}>
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
            {/* 6. Notifications Redesigned Popup */}
            {isNotificationPanelOpen && (
                <div className={styles.notificationPopupOverlay} onClick={() => setIsNotificationPanelOpen(false)}>
                    <div className={styles.notificationPopup} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.popupHeader}>
                            <h3>Notifications</h3>
                            <button onClick={() => setIsNotificationPanelOpen(false)} className={styles.popupCloseBtn}>
                                <Icon iconName="Cancel" />
                            </button>
                        </div>
                        
                        <div className={styles.popupScrollArea}>

                            {/* Dynamic Ticket Notifications */}
                            {notifications.length === 0 && (
                                <div className={styles.emptyNotiLine}>
                                    No new notifications at this time.
                                </div>
                            )}

                            {notifications.map(noti => (
                                <div key={noti.id} className={styles.notiItem} onClick={async () => {
                                    // Mark as read in localStorage
                                    const user = await spService._sp.web.currentUser();
                                    const seenStatusKey = `helpdesk_seen_status_${user.Id}`;
                                    const seenCommentsKey = `helpdesk_seen_comments_${user.Id}`;
                                    
                                    if (noti.type === 'status') {
                                        const seenStatus = JSON.parse(localStorage.getItem(seenStatusKey) || '{}');
                                        // Find the ticket and its actual current status
                                        const allT = [...activeTickets, ...resolvedTickets];
                                        const matchingTickets = allT.filter((t: any) => t.id === noti.ticketId);
                                        if (matchingTickets.length > 0) {
                                            const t = matchingTickets[0];
                                            seenStatus[t.spId || parseInt(noti.id.split('_')[1])] = t.status;
                                            localStorage.setItem(seenStatusKey, JSON.stringify(seenStatus));
                                        }
                                    } else if (noti.type === 'message') {
                                        const seenComments = JSON.parse(localStorage.getItem(seenCommentsKey) || '{}');
                                        const commentId = parseInt(noti.id.split('_')[2]);
                                        const ticketId = parseInt(noti.id.split('_')[1]);
                                        seenComments[ticketId] = commentId;
                                        localStorage.setItem(seenCommentsKey, JSON.stringify(seenComments));
                                    } else if (noti.id.indexOf('overdue_') === 0) {
                                        const ticketId = parseInt(noti.id.split('_')[1]);
                                        const seenOverdueKey = `helpdesk_seen_overdue_${user.Id}`;
                                        const seenOverdue = JSON.parse(localStorage.getItem(seenOverdueKey) || '{}');
                                        seenOverdue[ticketId] = true;
                                        localStorage.setItem(seenOverdueKey, JSON.stringify(seenOverdue));
                                    } else if (noti.id.indexOf('approaching_') === 0) {
                                        const ticketId = parseInt(noti.id.split('_')[1]);
                                        const seenApproachingKey = `helpdesk_seen_approaching_${user.Id}`;
                                        const seenApproaching = JSON.parse(localStorage.getItem(seenApproachingKey) || '{}');
                                        seenApproaching[ticketId] = true;
                                        localStorage.setItem(seenApproachingKey, JSON.stringify(seenApproaching));
                                    }

                                    setSelectedTicketId(noti.ticketId);
                                    setIsNotificationPanelOpen(false);
                                    // Refresh notifications list locally
                                    setNotifications(prev => prev.filter(n => n.id !== noti.id));
                                    setHasNotifications(notifications.length > 1);
                                }}>
                                    <div className={styles.notiAvatar}>
                                        <div className={`${styles.avatarPlaceholder} ${noti.type === 'status' ? styles.statusIcon : styles.messageIcon}`}>
                                            <Icon iconName={noti.type === 'status' ? "ReminderTime" : "Message"} />
                                        </div>
                                    </div>
                                    <div className={styles.notiContent}>
                                        <div className={styles.notiRow}>
                                            <span className={styles.notiName}>{noti.title}</span>
                                            <span className={styles.notiTime}>{noti.date}</span>
                                        </div>
                                        <p className={styles.notiMsg}>{noti.message}</p>
                                    </div>
                                </div>
                            ))}

                        </div>

                        <div className={styles.popupFooter}>
                            <span className={styles.viewAllLink}>View All</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
