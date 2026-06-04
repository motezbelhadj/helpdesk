import * as React from 'react';
import { IAdminHelpdeskProps } from './IAdminHelpdeskProps';
import { AdminDashboard } from './AdminDashboard';
import { TicketManagement } from './TicketManagement';
import { UserManagement } from './UserManagement';
import { SPService } from '../../../services/SPService';
import styles from './AdminDashboard.module.scss';
import { Icon } from '@fluentui/react';

/**
 * State for the AdminHelpdesk component.
 */
export interface IAdminHelpdeskState {
  currentView: 'admin' | 'ticket-management' | 'user-management'; // Tracks the current active view
  userRole: 'Admin' | 'Agent' | 'User' | null;                   // Stores the role of the current user
  isLoading: boolean;                                            // Indicates if the initial data is loading
  isNotificationPanelOpen: boolean;                              // Controls notification popup visibility
  notifications: any[];                                          // List of admin notifications
  hasNotifications: boolean;                                     // Indicates if there are unread notifications
}

/**
 * Main AdminHelpdesk web part component.
 * Manages navigation between the Admin Dashboard, Ticket Management, and User Management views.
 */
export default class AdminHelpdesk extends React.Component<IAdminHelpdeskProps, IAdminHelpdeskState> {
  private _spService: SPService;

  constructor(props: IAdminHelpdeskProps) {
    super(props);
    this._spService = new SPService(this.props.context);
    this.state = {
      currentView: 'admin',
      userRole: null,
      isLoading: true,
      isNotificationPanelOpen: false,
      notifications: [],
      hasNotifications: false
    };
  }

  public async componentDidMount(): Promise<void> {
    try {
      const role = await this._spService.getCurrentUserRole();
      const allTickets = await this._spService.getAllTickets();
      this.calculateAdminNotifications(allTickets);

      this.setState({ 
        userRole: role, 
        currentView: role === 'Agent' ? 'ticket-management' : 'admin',
        isLoading: false 
      });
    } catch (error) {
      console.error("Error initializing admin helpdesk", error);
      this.setState({ isLoading: false });
    }
  }

  private calculateAdminNotifications(rawTickets: any[]): void {
    const newNotifications: any[] = [];
    
    for (const item of rawTickets) {
      const ticketId = item.Id;
      const reference = item.Reference || `TK-${item.Id}`;
      const status = item.Status || item.Statut || 'Pending';
      const priority = item.Priority || item.Priorite || 'Normal';
      const assignedTo = item.AssignedTo?.Title || item.AttribueA || 'Unassigned';

      if ((status === 'New' || status === 'Pending' || status === 'Nouveau') && assignedTo === 'Unassigned') {
        newNotifications.push({
          id: `unassigned_${ticketId}`,
          ticketId: ticketId,
          type: 'status',
          title: `New Unassigned Ticket: ${reference}`,
          message: `Ticket "${item.Title || 'Untitled'}" is waiting to be assigned.`,
          date: item.Created ? new Date(item.Created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
          rawDate: item.Created ? new Date(item.Created) : new Date()
        });
      } else if ((priority === 'High' || priority === 'Urgent') && status !== 'Resolved') {
        newNotifications.push({
          id: `urgent_${ticketId}`,
          ticketId: ticketId,
          type: 'message',
          title: `Urgent Ticket: ${reference}`,
          message: `High priority ticket "${item.Title || 'Untitled'}" requires attention.`,
          date: item.Modified ? new Date(item.Modified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
          rawDate: item.Modified ? new Date(item.Modified) : new Date()
        });
      }
    }

    newNotifications.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
    this.setState({
      notifications: newNotifications,
      hasNotifications: newNotifications.length > 0
    });
  }

  public render(): React.ReactElement<IAdminHelpdeskProps> {
    const {
      isDarkTheme,
      userDisplayName,
      context,
      userPageUrl,
      powerBIReportUrl
    } = this.props;

    const { currentView, userRole, isLoading, isNotificationPanelOpen, notifications } = this.state;

    if (isLoading) {
      return <div style={{ padding: '20px', textAlign: 'center' }}>Initializing...</div>;
    }

    const firstLetter = userDisplayName ? userDisplayName.charAt(0).toUpperCase() : 'A';

    return (
      <div className={`${styles.adminRoot} ${isDarkTheme ? styles.dark : ''}`}>
        {/* Left Navigation Sidebar */}
        <aside className={styles.leftSidebar}>
          <div className={styles.brandLogo}>
            Helpdesk <span style={{ color: 'var(--brand-orange)' }}>Admin</span>
          </div>



          <div className={styles.navGroup}>
            {userRole !== 'Agent' && (
              <div 
                className={`${styles.navItem} ${currentView === 'admin' ? styles.active : ''}`}
                onClick={() => this.setState({ currentView: 'admin' })}
              >
                <Icon iconName="BidiLtr" />
                <span>Dashboard Overview</span>
              </div>
            )}

            <div 
              className={`${styles.navItem} ${currentView === 'ticket-management' ? styles.active : ''}`}
              onClick={() => this.setState({ currentView: 'ticket-management' })}
            >
              <Icon iconName="Ticket" />
              <span>Ticket Management</span>
            </div>

            {userRole !== 'Agent' && (
              <div 
                className={`${styles.navItem} ${currentView === 'user-management' ? styles.active : ''}`}
                onClick={() => this.setState({ currentView: 'user-management' })}
              >
                <Icon iconName="Group" />
                <span>User Management</span>
              </div>
            )}

            {userPageUrl && (
              <div 
                className={styles.navItem}
                onClick={() => window.location.href = userPageUrl}
              >
                <Icon iconName="NavigateExternalInline" />
                <span>User Portal</span>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Wrapper */}
        <main className={styles.mainWrapper}>
          {/* Top Header */}
          <header className={styles.topHeader}>
            <div className={styles.headerTitle}>
              {currentView === 'admin' ? 'Admin Dashboard Overview' : currentView === 'ticket-management' ? 'Ticket Management' : 'User Management'}
            </div>
            <div className={styles.headerIcons}>

              <div className={styles.userAvatarSmall}>
                <i>{firstLetter}</i>
              </div>
            </div>
          </header>

          {/* Content Container */}
          <div className={styles.contentContainer}>
            {currentView === 'user-management' ? (
              <UserManagement
                isDarkTheme={isDarkTheme}
                context={context}
                spService={this._spService}
                onNavigateBack={() => {
                  if (userRole === 'Agent') {
                    if (userPageUrl) window.location.href = userPageUrl;
                  } else {
                    this.setState({ currentView: 'admin' });
                  }
                }}
              />
            ) : currentView === 'ticket-management' ? (
              <TicketManagement
                isDarkTheme={isDarkTheme}
                context={context}
                spService={this._spService}
                onNavigateBack={() => {
                  if (userRole === 'Agent') {
                    if (userPageUrl) window.location.href = userPageUrl;
                  } else {
                    this.setState({ currentView: 'admin' });
                  }
                }}
              />
            ) : (
              <AdminDashboard
                userDisplayName={userDisplayName}
                isDarkTheme={isDarkTheme}
                context={context}
                powerBIReportUrl={powerBIReportUrl}
                onNavigateBack={() => {
                  if (userPageUrl) {
                    window.location.href = userPageUrl;
                  } else {
                    alert('Please configure the User Portal URL in the web part properties first.');
                  }
                }}
                onNavigateToTickets={() => this.setState({ currentView: 'ticket-management' })}
                onNavigateToUsers={() => this.setState({ currentView: 'user-management' })}
              />
            )}
          </div>

          {/* Notifications Popup */}
          {isNotificationPanelOpen && (
            <div className={styles.notificationPopupOverlay} onClick={() => this.setState({ isNotificationPanelOpen: false })}>
                <div className={styles.notificationPopup} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.popupHeader}>
                        <h3>Admin Notifications</h3>
                        <button onClick={() => this.setState({ isNotificationPanelOpen: false })} className={styles.popupCloseBtn}>
                            <Icon iconName="Cancel" />
                        </button>
                    </div>
                    
                    <div className={styles.popupScrollArea}>
                        {notifications.length === 0 && (
                            <div className={styles.emptyNotiLine}>
                                No new notifications.
                            </div>
                        )}

                        {notifications.map(noti => (
                            <div key={noti.id} className={styles.notiItem} onClick={() => {
                                this.setState({ 
                                  currentView: 'ticket-management',
                                  isNotificationPanelOpen: false,
                                  notifications: notifications.filter(n => n.id !== noti.id),
                                  hasNotifications: notifications.length > 1
                                });
                            }}>
                                <div className={styles.notiAvatar}>
                                    <div className={`${styles.avatarPlaceholder} ${noti.type === 'status' ? styles.statusIcon : styles.messageIcon}`}>
                                        <Icon iconName={noti.type === 'status' ? "ReminderTime" : "Warning"} />
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
                        <span className={styles.viewAllLink} onClick={() => this.setState({ currentView: 'ticket-management', isNotificationPanelOpen: false })}>View All Tickets</span>
                    </div>
                </div>
            </div>
          )}
        </main>
      </div>
    );
  }
}
