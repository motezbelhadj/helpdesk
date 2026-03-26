import * as React from 'react';
import { useState, useEffect } from 'react';
import styles from './AgentHuman.module.scss';
import { SPService } from '../../../services/SPService';
import { Icon } from '@fluentui/react';

export interface ITicketDetailsProps {
  ticketId: number;
  onBack: () => void;
  spService: SPService;
}

export const AgentHumanTicketDetails: React.FC<ITicketDetailsProps> = ({ ticketId, onBack, spService }) => {
  const [ticket, setTicket] = useState<any>(null);
  const [comment, setComment] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [comments, setComments] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [ticketId]);

  const loadData = async () => {
    try {
      const all = await spService.getAllTickets();
      const filtered = all.filter((t: any) => t.Id === ticketId);
      if (filtered.length > 0) {
        setTicket(filtered[0]);
        const ticketComments = await spService.getComments(ticketId);
        setComments(ticketComments);
      }
    } catch (error) {
      console.error('Error loading ticket data', error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      await spService.updateTicket(ticket.Id, { Status: newStatus });
      await loadData();
    } catch (error) {
      console.error("Error updating status", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddComment = async () => {
    if (!comment) return;
    setIsUpdating(true);
    try {
      await spService.addComment(ticketId, comment);
      setComment('');
      await loadData();
    } catch (error) {
      console.error("Error adding comment", error);
      alert("Failed to post comment. Please verify if the 'ticket_comments' list exists in SharePoint.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (!ticket) return <div className={styles.loading}>Loading Ticket Details...</div>;

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={onBack} className={styles.btnPrimary} style={{ background: 'rgba(255,255,255,0.2)', boxShadow: 'none', padding: '8px' }}>
            <Icon iconName="Back" />
          </button>
          <h2 style={{ fontSize: '1.4rem' }}>{ticket.Reference || `TK-${ticket.Id}`}</h2>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button disabled={isUpdating} onClick={() => handleStatusChange('In Progress')} className={styles.btnPrimary} style={{ background: '#dbeafe', color: '#1e40af' }}>
            <Icon iconName="Processing" style={{ marginRight: '8px' }} />
            Mark In Progress
          </button>
          <button disabled={isUpdating} onClick={() => handleStatusChange('Awaiting Feedback')} className={styles.btnPrimary} style={{ background: '#fef3c7', color: '#92400e' }}>
            <Icon iconName="Wait" style={{ marginRight: '8px' }} />
            Awaiting Feedback
          </button>
        </div>
      </header>

      <div className={styles.detailView}>
        <div className={styles.mainContent}>
          <div className={styles.section} style={{ marginBottom: '24px' }}>
            <h3 style={{ border: 'none', marginBottom: '8px' }}>{ticket.Title}</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>Submitted on {new Date().toLocaleDateString()}</p>
            
            <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, marginBottom: '8px', color: 'var(--brand-dark-blue)' }}>Description</div>
              <p style={{ margin: 0, lineHeight: '1.6', color: '#334155' }}>{ticket.Description || 'No description provided.'}</p>
            </div>

            <div className={styles.comments}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <Icon iconName="ChatList" style={{ color: 'var(--brand-orange)', fontSize: '20px' }} />
                <h3 style={{ margin: 0, border: 'none' }}>Communication Feed</h3>
              </div>
              
              {(comments || []).map((c: any, i: number) => (
                <div key={i} className={styles.comment}>
                  <div className={styles.author}>
                    <span>{c.Author?.Title || 'You'}</span>
                    <small style={{ fontWeight: 400, color: '#94a3b8' }}>{new Date(c.Created).toLocaleString()}</small>
                  </div>
                  <div className={styles.text}>{c.Commentaire || c.Text}</div>
                </div>
              ))}
              
              <div style={{ marginTop: '12px' }}>
                <textarea 
                  placeholder="Post a reply or internal note..." 
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button 
                    onClick={handleAddComment} 
                    className={styles.btnPrimary}
                    disabled={isUpdating || !comment.trim()}
                  >
                    <Icon iconName={isUpdating ? "Sync" : "Send"} style={{ marginRight: '8px' }} />
                    {isUpdating ? "Posting..." : "Post Update"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.sidebar}>
          <div className={styles.section} style={{ marginBottom: '24px' }}>
            <h3 style={{ border: 'none', marginBottom: '16px' }}>Metadata</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Requester</span>
                <span style={{ fontWeight: 600 }}>{ticket.Author?.Title || 'Employee'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Category</span>
                <span style={{ fontWeight: 600 }}>{ticket.Category || 'IT Support'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Priority</span>
                <span className={`${styles.status} ${
                  (ticket.Priority === 'High' || ticket.Priorite === 'Haute') ? styles.high : 
                  (ticket.Priority === 'Urgent' || ticket.Priorite === 'Urgent') ? styles.urgent : ''
                }`}>
                  {ticket.Priority || ticket.Priorite || 'Normal'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>State</span>
                <span className={`${styles.status} ${
                  ticket.Status === 'In Progress' ? styles.inProgress : 
                  ticket.Status === 'Resolved' ? styles.resolved : 
                  ticket.Status === 'Awaiting Feedback' ? styles.awaitingFeedback : 
                  styles.pending}`}>
                  {ticket.Status || 'Pending'}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.aiPanel}>
            <h4>✨ Agent Copilot Suggestion</h4>
            <p style={{ fontSize: '0.85rem', color: '#1e293b', lineHeight: '1.5', margin: '12px 0' }}>
              This request seems related to account access. Suggest verifying the user's role in the primary AD group.
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button className={styles.btnPrimary} style={{ flex: 1, fontSize: '0.8rem', padding: '8px' }}>
                Execute Action
              </button>
              <button className={styles.btnPrimary} style={{ flex: 1, fontSize: '0.8rem', padding: '8px', background: 'white', color: '#0369a1', border: '1px solid #0369a1', boxShadow: 'none' }}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
