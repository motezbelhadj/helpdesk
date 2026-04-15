import * as React from 'react';
import { useState, useEffect } from 'react';
import styles from './AgentHuman.module.scss';
import { SPService } from '../../../services/SPService';
import { Icon } from '@fluentui/react';

export interface ILeaderboardProps {
  spService: SPService;
  onBack: () => void;
}

interface IAgentStat {
  id: string;
  name: string;
  resolvedCount: number;
  avgResolutionHours: number;
  badges: string[];
}

export const AgentHumanLeaderboard: React.FC<ILeaderboardProps> = ({ spService, onBack }) => {
  const [agents, setAgents] = useState<IAgentStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const allTickets = await spService.getAllTickets();

      // Extract unique agents who have at least one ticket assigned to them
      const uniqueAgentMap: { [id: number]: { id: number, name: string } } = {};
      allTickets.forEach((t: any) => {
          if (t.AssignedTo && t.AssignedTo.Id) {
              uniqueAgentMap[t.AssignedTo.Id] = {
                  id: t.AssignedTo.Id,
                  name: t.AssignedTo.Title || 'Unknown'
              };
          }
      });
      
      const rawAgents: { id: number, name: string }[] = Object.keys(uniqueAgentMap).map(key => uniqueAgentMap[parseInt(key, 10)]);

      const stats: IAgentStat[] = rawAgents.map((ag: { id: number, name: string }) => {
        const assignedTickets = allTickets.filter((t: any) => t.AssignedTo && t.AssignedTo.Id === ag.id);
        const resolvedTickets = assignedTickets.filter((t: any) => t.Status === 'Resolved' || t.Status === 'Resolu' || t.status === 'Resolved');
        
        // Simulating resolution time since we don't have explicit Modified in our base selection
        let totalHours = 0;
        resolvedTickets.forEach((t: any) => {
            const created = new Date(t.Created).getTime();
            const modified = new Date(t.Modified || t.Created).getTime(); 
            totalHours += Math.abs(modified - created) / (1000 * 60 * 60);
        });
        
        const avgResolutionHours = resolvedTickets.length > 0 ? (totalHours / resolvedTickets.length) : 0;
        
        const badges: string[] = [];
        if (resolvedTickets.length >= 3) badges.push('Problem Solver');
        if (resolvedTickets.length > 0 && avgResolutionHours < 24) badges.push('Fast Responder');
        
        return {
            id: ag.id.toString(),
            name: ag.name,
            resolvedCount: resolvedTickets.length,
            avgResolutionHours: avgResolutionHours,
            badges: badges
        };
      });
      
      // Sort by highest resolved count
      stats.sort((a, b) => b.resolvedCount - a.resolvedCount);
      
      // Top resolver badge
      if (stats.length > 0 && stats[0].resolvedCount > 0) {
          if (stats[0].badges.indexOf('Top Resolver') === -1) {
              stats[0].badges.push('Top Resolver');
          }
      }
      
      setAgents(stats);
    } catch (error) {
      console.error("Error loading agent stats for leaderboard", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRankClass = (index: number) => {
      if (index === 0) return styles.rankGold;
      if (index === 1) return styles.rankSilver;
      if (index === 2) return styles.rankBronze;
      return styles.rankStandard;
  };

  const renderBadge = (badge: string, index: number) => {
      let iconName = 'Ribbon';
      let bgColor = '#f1f5f9';
      let color = '#475569';

      if (badge === 'Top Resolver') { iconName = 'Trophy2Solid'; bgColor = '#fef08a'; color = '#854d0e'; }
      if (badge === 'Problem Solver') { iconName = 'Puzzle'; bgColor = '#bfdbfe'; color = '#1e40af'; }
      if (badge === 'Fast Responder') { iconName = 'LightningBolt'; bgColor = '#bbf7d0'; color = '#166534'; }

      return (
          <div key={index} className={styles.badgeItem} style={{ background: bgColor, color: color }} title={badge}>
              <Icon iconName={iconName} /> {badge}
          </div>
      );
  };

  if (isLoading) return <div className={styles.loading}>Generating Leaderboard...</div>;

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div>
          <h2>Agent Leaderboard</h2>
          <p style={{ margin: '8px 0 0 0', opacity: 0.8, fontSize: '0.9rem' }}>Recognizing top performers and outstanding contributions.</p>
        </div>
        <div>
          <button className={styles.btnPrimary} style={{ background: 'rgba(255,255,255,0.2)', boxShadow: 'none' }} onClick={onBack}>
            <Icon iconName="Back" style={{ marginRight: '8px' }} />
            Back to Dashboard
          </button>
        </div>
      </header>

      <section className={styles.section} style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
        <div className={styles.leaderboardGrid}>
            {agents.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '16px' }}>
                    <p>No agent data available to generate leaderboard.</p>
                </div>
            ) : (
                agents.map((agent, index) => (
                    <div key={agent.id} className={`${styles.leaderboardCard} ${getRankClass(index)}`}>
                        <div className={styles.rankCircle}>
                            #{index + 1}
                        </div>
                        <div className={styles.agentInfo}>
                            <h3>{agent.name}</h3>
                            <div className={styles.metrics}>
                                <span><strong>{agent.resolvedCount}</strong> Tickets Resolved</span>
                                {agent.resolvedCount > 0 && (
                                    <span> • Avg Time: {agent.avgResolutionHours.toFixed(1)}h</span>
                                )}
                            </div>
                        </div>
                        <div className={styles.badgesContainer}>
                            {agent.badges.map((b, i) => renderBadge(b, i))}
                        </div>
                    </div>
                ))
            )}
        </div>
      </section>
    </div>
  );
};
