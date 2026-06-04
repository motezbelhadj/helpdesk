import * as React from 'react';
import { useState, useEffect } from 'react';
import styles from './AgentHuman.module.scss';
import { IAgentHumanProps } from './IAgentHumanProps';
import { AgentHumanDashboard } from './AgentHumanDashboard';
import { AgentHumanTicketList } from './AgentHumanTicketList';
import { AgentHumanTicketDetails } from './AgentHumanTicketDetails';
import { AgentHumanLeaderboard } from './AgentHumanLeaderboard';
import { SPService } from '../../../services/SPService';
import { Icon } from '@fluentui/react';

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
 * AgentHuman Component
 * 
 * Main container for the Agent web part. Manages navigation between
 * the agent dashboard, ticket list, and ticket details views.
 * 
 * Redesigned to include a premium sidebar and unified layout.
 */
export const AgentHuman: React.FC<IAgentHumanProps> = (props) => {
    const [currentView, setCurrentView] = useState<'dashboard' | 'list' | 'details' | 'leaderboard'>('dashboard');
    const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
    const [tickets, setTickets] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const spService = new SPService(props.context);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const user = await spService._sp.web.currentUser();
                const myTickets = await spService.getAgentTickets(user.Id);
                setTickets(myTickets);
            } catch (error) {
                console.error("Error loading tickets", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [refreshKey]);

    const navigateToDetails = (id: number) => {
        setSelectedTicketId(id);
        setCurrentView('details');
    };

    const renderView = () => {
        if (isLoading) return <div className={styles.loading}>Loading Agent Interface...</div>;

        switch (currentView) {
            case 'dashboard':
                return <AgentHumanDashboard tickets={tickets} onNavigateToList={() => setCurrentView('list')} onNavigateToDetails={navigateToDetails} userPageUrl={props.userPageUrl} onNavigateToLeaderboard={() => setCurrentView('leaderboard')} />;
            case 'list':
                return <AgentHumanTicketList tickets={tickets} onNavigateToDetails={navigateToDetails} onBack={() => { setCurrentView('dashboard'); setRefreshKey(k => k + 1); }} spService={spService} />;
            case 'details':
                return <AgentHumanTicketDetails ticketId={selectedTicketId!} onBack={() => { setCurrentView('list'); setRefreshKey(k => k + 1); }} spService={spService} agentAIPageUrl={props.agentAIPageUrl} />;
            case 'leaderboard':
                return <AgentHumanLeaderboard spService={spService} onBack={() => setCurrentView('dashboard')} />;
            default:
                return <AgentHumanDashboard tickets={tickets} onNavigateToList={() => setCurrentView('list')} onNavigateToDetails={navigateToDetails} onNavigateToLeaderboard={() => setCurrentView('leaderboard')} />;
        }
    };

    const getViewTitle = () => {
        switch (currentView) {
            case 'dashboard': return 'Agent Dashboard';
            case 'list': return 'My Ticket Queue';
            case 'details': return 'Ticket Details';
            case 'leaderboard': return 'Leaderboard';
            default: return 'Agent Pro';
        }
    };

    return (
        <div className={`${styles.agentHuman} ${props.isDarkTheme ? styles.dark : ''}`}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.brandLogo}>Agent Pro</div>

                <div className={styles.navGroup}>
                    <div className={`${styles.navItem} ${currentView === 'dashboard' ? styles.active : ''}`} onClick={() => setCurrentView('dashboard')}>
                        <Icon iconName="ViewDashboard" />
                        <span>Dashboard</span>
                    </div>
                    <div className={`${styles.navItem} ${currentView === 'list' ? styles.active : ''}`} onClick={() => setCurrentView('list')}>
                        <Icon iconName="List" />
                        <span>Ticket Queue</span>
                    </div>
                    <div className={`${styles.navItem} ${currentView === 'leaderboard' ? styles.active : ''}`} onClick={() => setCurrentView('leaderboard')}>
                        <Icon iconName="Trophy2Solid" />
                        <span>Leaderboard</span>
                    </div>
                    {props.userPageUrl && (
                        <div className={styles.navItem} onClick={() => window.location.href = props.userPageUrl!}>
                            <Icon iconName="Back" />
                            <span>User Portal</span>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content Area */}
            <main className={styles.mainContent}>
                {/* Top Header */}
                <header className={styles.topHeader}>
                    <div className={styles.headerTitle}>{getViewTitle()}</div>
                </header>

                <div className={styles.contentWrapper}>
                    {renderView()}
                </div>
            </main>
        </div>
    );
};

export default AgentHuman;
