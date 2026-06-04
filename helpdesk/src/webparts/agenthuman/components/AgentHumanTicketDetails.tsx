import * as React from 'react';
import { useState, useEffect } from 'react';
import styles from './AgentHuman.module.scss';
import { SPService } from '../../../services/SPService';
import { Icon, PrimaryButton } from '@fluentui/react';

/**
 * Properties for the AgentHumanTicketDetails component.
 */
export interface ITicketDetailsProps {
  ticketId: number;           // The SharePoint ID of the ticket to display
  onBack: () => void;           // Callback to return to the ticket list
  spService: SPService;        // Service for SharePoint operations
  agentAIPageUrl?: string;      // Optional URL for the AI assistant
}

/**
 * AgentHumanTicketDetails Component
 * 
 * Displays the detailed view of a ticket for the agent, allowing them to 
 * update status, post comments/internal notes, and view AI-driven suggestions.
 * 
 * Redesigned to match the Helpdesk premium style.
 */
export const AgentHumanTicketDetails: React.FC<ITicketDetailsProps> = ({ ticketId, onBack, spService, agentAIPageUrl }) => {
  const [ticket, setTicket] = useState<any>(null);
  const [comment, setComment] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [currentUserTitle, setCurrentUserTitle] = useState<string>('');
  const [isAiDismissed, setIsAiDismissed] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    spService.getCurrentUserProfile().then((user: any) => {
        if (user && user.Title) setCurrentUserTitle(user.Title);
    });
    loadData();
  }, [ticketId]);

  // Auto-sync comments every 10 seconds
  useEffect(() => {
    if (!ticketId) return;
    const intervalId = setInterval(() => {
        spService.getComments(ticketId).then(setComments).catch(console.error);
    }, 10000);
    return () => clearInterval(intervalId);
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
      const newComment = comment;
      const optimisticComment = {
        Commentaire: newComment,
        Text: newComment,
        Created: new Date().toISOString(),
        Author: { Title: 'You' }
      };
      setComments(prev => [...prev, optimisticComment]);
      setComment('');
      
      await spService.addComment(ticketId, newComment);
      
      setTimeout(() => {
          loadData().catch(e => console.error(e));
      }, 1000);
    } catch (error) {
      console.error("Error adding comment", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExecuteAction = () => {
    if (!agentAIPageUrl) {
      alert("Please configure the Agent AI Page URL in the web part properties.");
      return;
    }
    const query = `${ticket.Title}: ${ticket.Description || ''}`;
    const url = new URL(agentAIPageUrl, window.location.origin);
    url.searchParams.set('q', query);
    url.searchParams.set('ticketId', ticketId.toString());
    window.location.href = url.toString();
  };

  if (!ticket) return <div className={styles.loading}>Loading Ticket Details...</div>;

  const deadlineDate = ticket.DueDate ? new Date(ticket.DueDate) : spService.calculateDeadline(new Date(ticket.Created), ticket.Priorite || ticket.Priority || 'Normal');

  return (
    <div className={styles.dashboard}>
      {/* Detail Header Bar (Redesigned to match image) */}
      <header className={styles.headerBar}>
        <div className={styles.headerLeft}>
          <button onClick={onBack} className={styles.backBtn} title="Back">
            <Icon iconName="Back" />
          </button>
          <div className={styles.ticketTitleGroup}>
            <h2>{ticket.Reference || `TKT-2026-${ticket.Id}`}</h2>
          </div>
        </div>
        <div className={styles.headerRight}>
          <button 
            disabled={isUpdating} 
            onClick={() => handleStatusChange('In Progress')} 
            className={styles.btnInProgress}
          >
            <Icon iconName="Processing" />
            Mark In Progress
          </button>
          <button 
            disabled={isUpdating} 
            onClick={() => handleStatusChange('Awaiting Feedback')} 
            className={styles.btnAwaiting}
          >
            Awaiting Feedback
          </button>
          {ticket.Status === 'Resolved' && (
             <span className={styles.status} style={{ background: '#dcfce7', color: '#166534', padding: '10px 20px', borderRadius: '8px' }}>
                Resolved
             </span>
          )}
        </div>
      </header>

      <div className={styles.detailView}>
        {/* Left Column: Description and Conversation */}
        <div className={styles.mainContent}>
          <div className={styles.whiteCard}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{ticket.Title}</h2>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Submitted on {new Date(ticket.Created).toLocaleDateString()}</span>
            
            <div className={styles.descriptionBox}>
              <div className={styles.descLabel}>Problem Description</div>
              <p>{ticket.Description || 'No description provided.'}</p>
            </div>
          </div>

          <div className={styles.whiteCard}>
            <h3><Icon iconName="ChatList" /> Communication Feed</h3>
            <div className={styles.comments}>
              {(comments || []).map((c: any, i: number) => {
                const isMe = c.Author?.Title === currentUserTitle || c.Author?.Title === 'You';
                return (
                  <div key={i} className={styles.comment} style={isMe ? { borderLeftColor: '#2563eb' } : {}}>
                    <div className={styles.author}>
                      <span>{isMe ? 'You' : (c.Author?.Title || 'User')}</span>
                      <small style={{ fontWeight: 400, color: '#94a3b8' }}>{new Date(c.Created).toLocaleString()}</small>
                    </div>
                    <div className={styles.text}>{c.Commentaire || c.Text}</div>
                  </div>
                );
              })}
            </div>
            
            <div style={{ marginTop: '24px' }}>
              <textarea 
                placeholder="Post a reply or internal note..." 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <PrimaryButton 
                  onClick={handleAddComment} 
                  disabled={isUpdating || !comment.trim()}
                  style={{ borderRadius: '8px' }}
                >
                  <Icon iconName={isUpdating ? "Sync" : "Send"} style={{ marginRight: '8px' }} />
                  {isUpdating ? "Posting..." : "Post Update"}
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Metadata and AI */}
        <div className={styles.sidebar}>
          <div className={styles.whiteCard}>
            <h3><Icon iconName="Info" /> Metadata</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Requester</span>
                <span style={{ fontWeight: 600 }}>{ticket.Author?.Title || 'Employee'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Category</span>
                <span style={{ fontWeight: 600 }}>{ticket.Category || 'IT Support'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Priority</span>
                <span className={`${styles.status} ${
                  (ticket.Priority === 'High' || ticket.Priorite === 'Haute') ? styles.high : 
                  (ticket.Priority === 'Urgent' || ticket.Priorite === 'Urgent') ? styles.urgent : ''
                }`}>
                  {ticket.Priority || ticket.Priorite || 'Normal'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>State</span>
                <span className={`${styles.status} ${
                  ticket.Status === 'In Progress' ? styles.inProgress : 
                  ticket.Status === 'Resolved' ? styles.resolved : 
                  ticket.Status === 'Awaiting Feedback' ? styles.awaitingFeedback : 
                  styles.pending}`}>
                  {ticket.Status || 'Pending'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>SLA Deadline</span>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#ef4444' }}>
                  {deadlineDate.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {!isAiDismissed && (
            <div className={styles.aiPanel}>
              <h4>Agent AI Suggestion</h4>
              <p style={{ fontSize: '0.85rem', color: '#1e293b', lineHeight: '1.5', margin: '12px 0' }}>
                Based on the description, this issue is likely related to account permissions. Suggest checking the user's AD group membership.
              </p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button className={styles.btnPrimary} style={{ flex: 1, fontSize: '0.8rem', padding: '8px' }} onClick={handleExecuteAction}>
                  Execute Action
                </button>
                <button className={styles.btnPrimary} style={{ flex: 1, fontSize: '0.8rem', padding: '8px', background: 'white', color: '#0369a1', border: '1px solid #0369a1', boxShadow: 'none' }} onClick={() => setIsAiDismissed(true)}>
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
