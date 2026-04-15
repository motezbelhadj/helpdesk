import * as React from 'react';
import { useState, useEffect } from 'react';
import styles from './AgentHuman.module.scss';
import { IAgentHumanProps } from './IAgentHumanProps';
import { AgentHumanDashboard } from './AgentHumanDashboard';
import { AgentHumanTicketList } from './AgentHumanTicketList';
import { AgentHumanTicketDetails } from './AgentHumanTicketDetails';
import { AgentHumanLeaderboard } from './AgentHumanLeaderboard';
import { SPService } from '../../../services/SPService';

/**
 * AgentHuman Component
 * 
 * Main container for the Agent web part. Manages navigation between
 * the agent dashboard, ticket list, and ticket details views.
 * 
 * @param props The properties for this component (IAgentHumanProps)
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

  return (
    <div className={`${styles.agentHuman} ${props.isDarkTheme ? styles.dark : ''}`}>
      {renderView()}
    </div>
  );
};

export default AgentHuman;
