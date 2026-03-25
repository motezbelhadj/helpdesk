import * as React from 'react';
import { useState, useEffect } from 'react';
import styles from './AdminDashboard.module.scss';
import { escape } from '@microsoft/sp-lodash-subset';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { Icon } from '@fluentui/react';
import { SPService } from '../../../services/SPService';

export interface IAdminDashboardProps {
  userDisplayName: string;
  isDarkTheme: boolean;
  context: WebPartContext;
  onNavigateBack: () => void;
  onNavigateToTickets: () => void;
  onNavigateToUsers: () => void;
  powerBIReportUrl?: string;
  onNavigateToAgent?: () => void;
}

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
                <h2>Tableau de Bord Admin</h2>
                <p>Bienvenue, {escape(userDisplayName)}. Voici un aperçu du système {isLoading && '(Chargement...)'}</p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
                <button className={styles.backButton} style={{ border: '2px solid var(--brand-accent-blue)', color: 'var(--brand-accent-blue)' }} onClick={props.onNavigateToUsers}>
                    Gestion Utilisateurs
                </button>
                {props.onNavigateToAgent && (
                    <button className={styles.backButton} style={{ border: '2px solid #f58220', color: '#f58220' }} onClick={props.onNavigateToAgent}>
                        Mode Agent (Dev)
                    </button>
                )}
                <button className={styles.backButton} onClick={onNavigateBack}>
                    Vue Utilisateur
                </button>
            </div>
        </header>

        {/* KPI Cards */}
        <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
                <div className={styles.kpiValue}>{totalOpen}</div>
                <div className={styles.kpiLabel}>Tickets Ouverts</div>
            </div>
            <div className={styles.kpiCard}>
                <div className={styles.kpiValue}>{totalResolved}</div>
                <div className={styles.kpiLabel}>Tickets Résolus</div>
            </div>
            <div className={styles.kpiCard}>
                <div className={styles.kpiValue}>2.4h</div>
                <div className={styles.kpiLabel}>Temps de Résolution Moy.</div>
            </div>
            <div className={styles.kpiCard}>
                <div className={`${styles.kpiValue} ${styles.warningText}`}>{pendingTickets}</div>
                <div className={styles.kpiLabel}>Tickets en Attente</div>
            </div>
        </div>

        <div className={styles.dashboardGrid}>
            <div className={styles.mainContent}>
                <div className={styles.card}>
                    <h3>Tendances par Catégorie</h3>
                    <div className={styles.chartMetric}>Distribution en temps réel</div>
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
                        <h3>Tickets par Catégories</h3>
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
                        <h3>Distribution des Priorités</h3>
                         <div className={styles.statsList}>
                             <div className={styles.statItem}>
                                 <div className={styles.statLabel}>Haute</div>
                                 <div className={styles.statBarWrapper}>
                                    <div className={styles.statBar} style={{width: `${(highPriority/tickets.length)*100}%`, backgroundColor: '#d13438'}}></div>
                                 </div>
                                 <div className={styles.statValue}>{highPriority}</div>
                             </div>
                             <div className={styles.statItem}>
                                 <div className={styles.statLabel}>Moyenne</div>
                                 <div className={styles.statBarWrapper}>
                                    <div className={styles.statBar} style={{width: `${(medPriority/tickets.length)*100}%`, backgroundColor: '#f58220'}}></div>
                                 </div>
                                 <div className={styles.statValue}>{medPriority}</div>
                             </div>
                             <div className={styles.statItem}>
                                 <div className={styles.statLabel}>Basse</div>
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
                            <h3>Rapport Power BI Live</h3>
                            <span style={{ fontSize: '0.8em', color: 'var(--text-secondary)' }}>Synchronisation Activée</span>
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
                                <h4>Analyses Avancées avec Power BI</h4>
                                <p>Pour des insights plus profonds, connectez vos listes SharePoint à Power BI et collez l'URL ici.</p>
                            </div>
                            <button className={styles.learnMoreBtn} onClick={() => window.open('https://powerbi.microsoft.com/', '_blank')}>
                                En savoir plus
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className={styles.sidebar}>
                <div className={styles.card}>
                    <h3>Tickets Récents</h3>
                    <div className={styles.activityFeed}>
                        {tickets.slice(0, 5).map(ticket => (
                            <div key={ticket.Id} className={styles.activityItem}>
                                <div className={`${styles.activityDot} ${(ticket.Status || '').toLowerCase().indexOf('resol') !== -1 ? styles.success : ''}`}></div>
                                <div className={styles.activityContent}>
                                    <strong>{ticket.Reference || `TK-${ticket.Id}`}</strong>: {ticket.Title}
                                    <div className={styles.activityTime}>{ticket.Created ? new Date(ticket.Created).toLocaleDateString() : 'N/A'} • {ticket.Categorie || 'Autre'}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                     <button className={styles.viewAllButton} onClick={props.onNavigateToTickets}>Voir tous les Tickets</button>
                </div>
            </div>
        </div>
    </div>
  );
};
