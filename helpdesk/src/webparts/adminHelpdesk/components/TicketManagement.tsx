import * as React from 'react';
import { useState, useEffect } from 'react';
import styles from './TicketManagement.module.scss';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { Icon, TooltipHost } from '@fluentui/react';
import { SPService } from '../../../services/SPService';

export interface ITicketManagementProps {
  isDarkTheme: boolean;
  context: WebPartContext;
  spService: SPService;
  onNavigateBack: () => void;
}

export const TicketManagement: React.FC<ITicketManagementProps> = (props) => {
  const { isDarkTheme, spService, onNavigateBack } = props;
  const [tickets, setTickets] = useState<any[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [confirmDialog, setConfirmDialog] = useState<{message: string, onConfirm: () => void} | null>(null);

  // Filters & Sort
  const [statusFilter, setStatusFilter] = useState<string>('Tous');
  const [myTicketsOnly, setMyTicketsOnly] = useState<boolean>(false);
  const [sortField, setSortField] = useState<string>('Created');
  const [sortDescending, setSortDescending] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    loadData().catch(err => console.error(err));
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [tickets, statusFilter, myTicketsOnly, searchQuery, sortField, sortDescending]);

  useEffect(() => {
    if (selectedTicket) {
      loadComments(selectedTicket.Id).catch(err => console.error(err));
    }
  }, [selectedTicket]);

  const loadData = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const sp = (spService as any)._sp;
      const user = await sp.web.currentUser();
      setCurrentUser(user);
      
      const fetchedTickets = await spService.getAllTickets();
      setTickets(fetchedTickets);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadComments = async (ticketId: number) => {
    const fetchedComments = await spService.getComments(ticketId);
    setComments(fetchedComments);
  };

  const applyFiltersAndSort = (): void => {
    let result = [...tickets];

    if (statusFilter !== 'Tous') {
      result = result.filter(t => (t.Status || t.Statut) === statusFilter);
    }

    if (myTicketsOnly && currentUser) {
      result = result.filter(t => t.AssignedTo?.Id === currentUser.Id);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => 
        (t.Title || '').toLowerCase().indexOf(q) !== -1 ||
        (t.Reference || '').toLowerCase().indexOf(q) !== -1
      );
    }

    // Sort
    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      
      if (sortField === 'Created') {
        valA = new Date(a.Created).getTime();
        valB = new Date(b.Created).getTime();
      }

      if (valA < valB) return sortDescending ? 1 : -1;
      if (valA > valB) return sortDescending ? -1 : 1;
      return 0;
    });

    setFilteredTickets(result);
  };

  const handleUpdate = async (spId: number, updates: any, confirmationMsg: string) => {
    setConfirmDialog({
      message: confirmationMsg,
      onConfirm: async () => {
        try {
          await spService.updateTicket(spId, updates);
          await loadData(); // Reload
        } catch (err) {
          alert('Erreur lors de la mise à jour.');
        }
      }
    });
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTicket) return;
    try {
      await spService.addComment(selectedTicket.Id, newComment);
      setNewComment('');
      loadComments(selectedTicket.Id);
    } catch (err) {
      alert('Erreur lors de l’ajout du commentaire.');
    }
  };

  const getStatusColor = (status: string): string => {
    const s = (status || '').toLowerCase();
    if (s.indexOf('resol') !== -1) return '#10b981';
    if (s.indexOf('progress') !== -1 || s.indexOf('cours') !== -1) return '#3b82f6';
    if (s.indexOf('new') !== -1 || s.indexOf('nouveau') !== -1) return '#f58220';
    return '#94a3b8';
  };

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDescending(!sortDescending);
    } else {
      setSortField(field);
      setSortDescending(true);
    }
  };

  return (
    <div className={`${styles.ticketManagement} ${isDarkTheme ? styles.dark : ''}`}>
      <div className={(styles as any)['glassCard'] || styles.ticketManagement}>
        <header className={styles.header}>
          <h2>Gestion des Tickets</h2>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button 
              className={styles.backButton} 
              style={{ backgroundColor: myTicketsOnly ? 'var(--brand-orange)' : 'transparent', color: myTicketsOnly ? 'white' : 'var(--brand-orange)' }}
              onClick={() => setMyTicketsOnly(!myTicketsOnly)}
            >
              {myTicketsOnly ? 'Voir tous les tickets' : 'Mes tickets uniquement'}
            </button>
            <button className={styles.backButton} onClick={onNavigateBack}>
              Retour Dashboard
            </button>
          </div>
        </header>

        {/* Filters */}
        <div className={styles.filtersSection}>
          <div className={styles.filterGroup}>
            <label>Recherche</label>
            <input 
              type="text" 
              placeholder="Référence ou Titre..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className={styles.filterGroup}>
            <label>Statut</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="Tous">Tous les Statuts</option>
              <option value="New">Nouveau</option>
              <option value="In Progress">En cours</option>
              <option value="Resolved">Résolu</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableContainer}>
          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>Chargement...</div>
          ) : (
            <table className={styles.ticketTable}>
              <thead>
                <tr>
                  <th onClick={() => toggleSort('Reference')} style={{ cursor: 'pointer' }}>Référence {sortField === 'Reference' && (sortDescending ? '▼' : '▲')}</th>
                  <th>Titre</th>
                  <th>Statut</th>
                  <th onClick={() => toggleSort('Priorite')} style={{ cursor: 'pointer' }}>Priorité {sortField === 'Priorite' && (sortDescending ? '▼' : '▲')}</th>
                  <th onClick={() => toggleSort('Created')} style={{ cursor: 'pointer' }}>Date {sortField === 'Created' && (sortDescending ? '▼' : '▲')}</th>
                  <th>Assigné à</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map(ticket => (
                  <tr key={ticket.Id}>
                    <td style={{ fontWeight: 700 }} onClick={() => setSelectedTicket(ticket)}>{ticket.Reference || `TK-${ticket.Id}`}</td>
                    <td onClick={() => setSelectedTicket(ticket)}>{ticket.Title}</td>
                    <td onClick={() => setSelectedTicket(ticket)}>
                      <span className={styles.statusBadge} style={{ background: getStatusColor(ticket.Status) + '20', color: getStatusColor(ticket.Status) }}>
                        {ticket.Status === 'New' ? 'Nouveau' : ticket.Status === 'Resolved' ? 'Résolu' : ticket.Status}
                      </span>
                    </td>
                    <td onClick={() => setSelectedTicket(ticket)}>
                      <span className={`${(styles as any)['priorityChip']} ${ticket.Priorite === 'Haute' || ticket.Priorite === 'Urgente' ? (styles as any)['high'] : ticket.Priorite === 'Normale' ? (styles as any)['medium'] : (styles as any)['low']}`}>
                        {ticket.Priorite || 'Normale'}
                      </span>
                    </td>
                    <td onClick={() => setSelectedTicket(ticket)}>{ticket.Created ? new Date(ticket.Created).toLocaleDateString() : 'N/A'}</td>
                    <td onClick={() => setSelectedTicket(ticket)}>{ticket.AssignedTo?.Title || 'Non assigné'}</td>
                    <td>
                      <TooltipHost content="Modifier le Ticket">
                        <button className={styles.modifyBtn} onClick={() => setSelectedTicket(ticket)}>
                          <Icon iconName="Edit" />
                        </button>
                      </TooltipHost>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Details Side Panel */}
      {selectedTicket && (
        <div className={styles.sidePanel}>
          <div className={styles.panelHeader}>
            <h3>Détails du Ticket</h3>
            <button className={styles.closeButton} onClick={() => setSelectedTicket(null)}>&times;</button>
          </div>
          
          <div className={styles.panelContent}>
            <div className={styles.detailGroup}>
              <label>Référence</label>
              <p><strong>{selectedTicket.Reference || `TK-${selectedTicket.Id}`}</strong></p>
            </div>
            <div className={styles.detailGroup}>
              <label>Demandeur</label>
              <p>{selectedTicket.Author?.Title || 'Anonyme'}</p>
            </div>
            <div className={styles.detailGroup}>
              <label>Statut Actuel</label>
              <select 
                value={selectedTicket.Status} 
                onChange={(e) => handleUpdate(selectedTicket.Id, { Status: e.target.value }, `Changer le statut en ${e.target.value} ?`)}
              >
                <option value="New">Nouveau</option>
                <option value="In Progress">En cours</option>
                <option value="Resolved">Résolu</option>
              </select>
            </div>

            {/* US-16: Assign to Me */}
            {selectedTicket.AssignedTo?.Id !== currentUser?.Id && (
              <button 
                className={styles.actionButton} 
                style={{ backgroundColor: '#223445', marginBottom: '10px' }}
                onClick={() => handleUpdate(selectedTicket.Id, { AssignedToId: currentUser.Id }, 'Voulez-vous vous assigner ce ticket ?')}
              >
                🙋 Me l'assigner
              </button>
            )}

            {/* US-18: Comments */}
            <div className={styles.detailGroup} style={{ marginTop: '20px' }}>
              <label>Commentaires (History)</label>
              <div style={{ maxHeight: '200px', overflowY: 'auto', background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '8px' }}>
                {comments.length > 0 ? comments.map(c => (
                  <div key={c.Id} style={{ marginBottom: '8px', fontSize: '0.85rem' }}>
                    <strong>{c.Author?.Title}</strong>: {c.Commentaire || c.Text}
                    <div style={{ fontSize: '0.7rem', color: 'gray' }}>{new Date(c.Created).toLocaleString()}</div>
                  </div>
                )) : <p style={{ fontSize: '0.8rem', color: 'gray' }}>Aucun commentaire.</p>}
              </div>
              <textarea 
                placeholder="Ajouter un commentaire..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                style={{ width: '100%', marginTop: '10px', padding: '10px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'transparent' }}
              />
              <button 
                className={styles.actionButton} 
                onClick={handleAddComment}
                disabled={!newComment.trim()}
              >
                Envoyer le commentaire
              </button>
            </div>

            {selectedTicket.Status !== 'Resolved' && (
              <button 
                className={styles.actionButton} 
                onClick={() => handleUpdate(selectedTicket.Id, { Status: 'Resolved' }, 'Clore ce ticket comme résolu ?')}
              >
                ✅ Résoudre le Ticket
              </button>
            )}
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Confirmer</h3>
            <p>{confirmDialog.message}</p>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setConfirmDialog(null)}>Annuler</button>
              <button className={styles.confirmBtn} onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }}>Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
