import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import styles from './NotificationHeaderComponent.module.scss';
import { SPFI } from '@pnp/sp';

export interface INotification {
  id: string;
  ticketId: number;
  type: 'status' | 'message' | 'overdue' | 'approaching';
  title: string;
  message: string;
  date: string;
  rawDate: Date;
  isRead: boolean;
}

export interface INotificationHeaderComponentProps {
  sp: SPFI;
  isSuiteBar?: boolean;
}

export const NotificationHeaderComponent: React.FC<INotificationHeaderComponentProps> = (props) => {
  const { sp, isSuiteBar } = props;
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch and calculate notifications on mount and every 60 seconds
  useEffect(() => {
    const load = (): void => {
      calculateNotifications().catch(console.error);
    };
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  const calculateNotifications = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const user = await sp.web.currentUser();
      const userId = user.Id;
      const displayName = user.Title;

      const seenStatusKey = `helpdesk_seen_status_${userId}`;
      const seenCommentsKey = `helpdesk_seen_comments_${userId}`;
      const seenOverdueKey = `helpdesk_seen_overdue_${userId}`;
      const seenApproachingKey = `helpdesk_seen_approaching_${userId}`;

      const seenStatus = JSON.parse(localStorage.getItem(seenStatusKey) || '{}');
      const seenComments = JSON.parse(localStorage.getItem(seenCommentsKey) || '{}');
      const seenOverdue = JSON.parse(localStorage.getItem(seenOverdueKey) || '{}');
      const seenApproaching = JSON.parse(localStorage.getItem(seenApproachingKey) || '{}');

      // Fetch tickets that the user created or is assigned to (supports both regular users and agents)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawTickets: any[] = await sp.web.lists.getByTitle('ticket').items
        .filter(`(AuthorId eq ${userId}) or (AssignedToId eq ${userId})`)
        .select('Id', 'Title', 'Reference', 'Statut', 'Status', 'Modified', 'Created', 'DueDate', 'Priorite')
        .orderBy('Modified', false)();

      const newNotifications: INotification[] = [];

      const SLA_CONFIG: { [key: string]: number } = {
        'Urgent': 2, 'High': 8, 'Normal': 24, 'Low': 48
      };

      for (const item of rawTickets) {
        const ticketId: number = item.Id;
        const reference: string = item.Reference || `TK-${item.Id}`;
        const currentStatus: string = item.Statut || item.Status || 'Pending';
        const priority: string = item.Priorite || 'Normal';

        // Compute deadline
        const hoursToAdd = SLA_CONFIG[priority] || 24;
        let deadline: Date;
        if (item.DueDate) {
          deadline = new Date(item.DueDate);
        } else {
          deadline = new Date(item.Created);
          deadline.setHours(deadline.getHours() + hoursToAdd);
        }

        // 1. Status change notification
        const statusLower = currentStatus.toLowerCase();
        if (statusLower !== 'pending' && statusLower !== 'nouveau') {
          if (seenStatus[ticketId] !== currentStatus) {
            newNotifications.push({
              id: `status_${ticketId}_${currentStatus}`,
              ticketId,
              type: 'status',
              title: `Status Updated: ${reference}`,
              message: `Your ticket status is now "${currentStatus}".`,
              date: new Date(item.Modified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              rawDate: new Date(item.Modified),
              isRead: false
            });
          }
        }

        // 2. New message notification
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const comments: any[] = await sp.web.lists.getByTitle('ticket_comments').items
            .filter(`TicketId eq ${ticketId}`)
            .select('Id', 'Commentaire', 'Text', 'Created', 'Author/Title')
            .expand('Author')
            .orderBy('Created', true)();

          if (comments.length > 0) {
            const last = comments[comments.length - 1];
            if (last.Author?.Title !== displayName && seenComments[ticketId] !== last.Id) {
              newNotifications.push({
                id: `msg_${ticketId}_${last.Id}`,
                ticketId,
                type: 'message',
                title: `New Message: ${reference}`,
                message: last.Commentaire || last.Text || 'New message from agent.',
                date: new Date(last.Created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                rawDate: new Date(last.Created),
                isRead: false
              });
            }
          }
        } catch {
          // comment list may not exist yet
        }

        // 3. Overdue
        const isOverdue = deadline.getTime() < Date.now() && statusLower !== 'resolved' && statusLower !== 'resolu';
        if (isOverdue && !seenOverdue[ticketId]) {
          newNotifications.push({
            id: `overdue_${ticketId}`,
            ticketId,
            type: 'overdue',
            title: `TICKET OVERDUE: ${reference}`,
            message: 'The SLA deadline for this ticket has passed.',
            date: deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            rawDate: deadline,
            isRead: false
          });
        }

        // 4. Approaching deadline (< 4 hours)
        const timeLeft = deadline.getTime() - Date.now();
        const isApproaching = timeLeft > 0 && timeLeft < 4 * 60 * 60 * 1000 && statusLower !== 'resolved' && statusLower !== 'resolu';
        if (isApproaching && !seenApproaching[ticketId]) {
          newNotifications.push({
            id: `approaching_${ticketId}`,
            ticketId,
            type: 'approaching',
            title: `DEADLINE APPROACHING: ${reference}`,
            message: 'This ticket is due in less than 4 hours!',
            date: deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            rawDate: deadline,
            isRead: false
          });
        }
      }

      newNotifications.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
      setNotifications(newNotifications);
    } catch (err) {
      console.error('NotificationHeader: error fetching notifications', err);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (noti: INotification): Promise<void> => {
    try {
      const user = await sp.web.currentUser();
      const userId = user.Id;

      if (noti.type === 'status') {
        const key = `helpdesk_seen_status_${userId}`;
        const seen = JSON.parse(localStorage.getItem(key) || '{}');
        seen[noti.ticketId] = noti.title.split('"')[1] || noti.title;
        localStorage.setItem(key, JSON.stringify(seen));
      } else if (noti.type === 'message') {
        const key = `helpdesk_seen_comments_${userId}`;
        const seen = JSON.parse(localStorage.getItem(key) || '{}');
        const commentId = parseInt(noti.id.split('_')[2]);
        seen[noti.ticketId] = commentId;
        localStorage.setItem(key, JSON.stringify(seen));
      } else if (noti.type === 'overdue') {
        const key = `helpdesk_seen_overdue_${userId}`;
        const seen = JSON.parse(localStorage.getItem(key) || '{}');
        seen[noti.ticketId] = true;
        localStorage.setItem(key, JSON.stringify(seen));
      } else if (noti.type === 'approaching') {
        const key = `helpdesk_seen_approaching_${userId}`;
        const seen = JSON.parse(localStorage.getItem(key) || '{}');
        seen[noti.ticketId] = true;
        localStorage.setItem(key, JSON.stringify(seen));
      }

      setNotifications(prev => prev.filter(n => n.id !== noti.id));
    } catch (err) {
      console.error('Error marking notification as read', err);
    }
  };

  const markAllRead = async (): Promise<void> => {
    for (const noti of notifications) {
      await markAsRead(noti);
    }
    setNotifications([]);
    setIsOpen(false);
  };

  const unreadCount = notifications.length;

  const getIcon = (type: string): JSX.Element => {
    switch (type) {
      case 'message':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0078d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        );
      case 'overdue':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e81123" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        );
      case 'approaching':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a4262c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0078d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        );
    }
  };

  const containerClass = isSuiteBar ? styles.suiteBarContainer : styles.notificationBar;
  const buttonClass = isSuiteBar ? styles.suiteBarButton : styles.bellButton;
  const iconClass = isSuiteBar ? styles.suiteBarBellIcon : styles.bellIcon;
  const badgeClass = isSuiteBar ? styles.suiteBarBadge : styles.badge;

  return (
    <div className={containerClass} ref={panelRef}>
      {/* Bell Button */}
      <button
        className={buttonClass}
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className={badgeClass}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className={styles.dropdownPanel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Notifications</span>
            {unreadCount > 0 && (
              <button className={styles.markAllBtn} onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className={styles.panelBody}>
            {isLoading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner} />
                <span>Loading notifications...</span>
              </div>
            ) : unreadCount === 0 ? (
              <div className={styles.emptyState}>
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#107c41" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '12px' }}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <p>You're all caught up!</p>
                <span>No new notifications at this time.</span>
              </div>
            ) : (
              notifications.map(noti => (
                <div
                  key={noti.id}
                  className={`${styles.notiItem} ${(styles as any)[noti.type] || ''}`}
                  onClick={() => markAsRead(noti).catch(console.error)}
                >
                  <div className={styles.notiIcon}>{getIcon(noti.type)}</div>
                  <div className={styles.notiContent}>
                    <div className={styles.notiTitle}>{noti.title}</div>
                    <div className={styles.notiMessage}>{noti.message}</div>
                    <div className={styles.notiTime}>{noti.date}</div>
                  </div>
                  <button
                    className={styles.dismissBtn}
                    onClick={(e) => { e.stopPropagation(); markAsRead(noti).catch(console.error); }}
                    title="Dismiss"
                  >×</button>
                </div>
              ))
            )}
          </div>

          {unreadCount > 0 && (
            <div className={styles.panelFooter}>
              <span>{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
