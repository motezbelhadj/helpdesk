import * as React from 'react';
import { useState, useEffect } from 'react';
import styles from './AgentDashboard.module.scss';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { SPService } from '../../../services/SPService';

export interface IAgentDashboardProps {
  userDisplayName: string;
  isDarkTheme: boolean;
  context: WebPartContext;
  spService: SPService;
  onNavigateBack: () => void;
  onNavigateToTickets: () => void;
}

export const AgentDashboard: React.FC<IAgentDashboardProps> = (props) => {
  const { userDisplayName, isDarkTheme, onNavigateBack, spService, onNavigateToTickets } = props;
  const [stats, setStats] = useState({ totalAssigned: 0, open: 0, resolved: 0 });
  const [recentTickets, setRecentTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAgentData = async () => {
      setIsLoading(true);
      try {
        const user = await spService['_sp'].web.currentUser(); // Accessing pnp sp directly for simplicity in this specific load
        const [agentStats, allTickets] = await Promise.all([
          spService.getAgentStats(user.Id),
          spService.getAllTickets()
        ]);
        setStats(agentStats);
        // Filter recent tickets assigned to me
        const myRecent = allTickets
          .filter(t => t.AssignedTo?.Id === user.Id)
          .slice(0, 5);
        setRecentTickets(myRecent);
      } catch (error) {
        console.error("Error loading agent dashboard data", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadAgentData().catch(err => console.error(err));
  }, []);

  return (
    <div className={`${styles.agentDashboard} ${isDarkTheme ? styles.dark : ''}`}>
      <header className={styles.header}>
        <div>
          <h2>Espace Agent Support</h2>
          <div className={styles.userDisplay}>Bienvenue, {userDisplayName}</div>
        </div>
        <button className={styles.viewAllBtn} style={{ width: 'auto', padding: '10px 20px' }} onClick={onNavigateBack}>
          Retour au Portail
        </button>
      </header>

      {/* Stats row */}
      <div className={styles.kpiSection}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiValue}>{stats.open}</span>
          <span className={styles.kpiLabel}>Mes Tickets Ouverts</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiValue}>{stats.resolved}</span>
          <span className={styles.kpiLabel}>Tickets Résolus</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiValue}>98%</span>
          <span className={styles.kpiLabel}>Satisfaction (SLA)</span>
        </div>
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.card}>
          <h3>Actions Rapides</h3>
          <div className={styles.actionGrid}>
            <button className={styles.actionBtn} onClick={onNavigateToTickets}>
              <div style={{ fontSize: '1.5rem' }}>📋</div>
              <span>Voir Mes Missions</span>
            </button>
            <button className={styles.actionBtn} onClick={onNavigateToTickets}>
              <div style={{ fontSize: '1.5rem' }}>⚡</div>
              <span>Nouveaux Tickets</span>
            </button>
          </div>
        </div>

        <div className={styles.card}>
          <h3>Missions Récentes</h3>
          <div className={styles.recentTickets}>
            {isLoading ? (
              <p>Chargement...</p>
            ) : recentTickets.length > 0 ? (
              recentTickets.map(t => (
                <li key={t.Id} className={styles.ticketItem} onClick={onNavigateToTickets}>
                  <span className={styles.ticketRef}>{t.Reference || `TK-${t.Id}`}</span>
                  <span className={styles.ticketTitle}>{t.Title}</span>
                  <span className={styles.ticketStatus}>{t.Status === 'New' ? 'Nouveau' : t.Status}</span>
                </li>
              ))
            ) : (
              <p>Aucun ticket assigné récemment.</p>
            )}
          </div>
          <button className={styles.viewAllBtn} onClick={onNavigateToTickets}>
            Gérer tous mes tickets
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentDashboard;
