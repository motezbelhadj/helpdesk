import * as React from 'react';
import { useState, useEffect } from 'react';
import styles from './Dashboard.module.scss';
import { SPService } from '../../../services/SPService';
import { Icon } from '@fluentui/react';

/**
 * Properties for the UserTicketDetails component.
 */
export interface IUserTicketDetailsProps {
    ticketId: string | number; // The ID or reference of the ticket to display
    onBack: () => void;         // Callback to return to the dashboard
    spService: SPService;      // Service for SharePoint operations
}

/**
 * UserTicketDetails Component
 * 
 * Displays the detailed view of a specific ticket for the user,
 * including ticket metadata, status, and a conversation feed.
 */
export const UserTicketDetails: React.FC<IUserTicketDetailsProps> = ({ ticketId, onBack, spService }) => {
    const [ticket, setTicket] = useState<any>(null);
    const [comment, setComment] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [comments, setComments] = useState<any[]>([]);
    const [currentUserTitle, setCurrentUserTitle] = useState<string>('');

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        spService.getCurrentUserProfile().then((user: any) => {
            if (user && user.Title) setCurrentUserTitle(user.Title);
        });
    }, []);

    useEffect(() => {
        loadData();
    }, [ticketId]);

    // Auto-sync comments every 5 seconds
    const ticketSPId = ticket?.Id;
    useEffect(() => {
        if (!ticketSPId) return;
        const intervalId = setInterval(() => {
            spService.getComments(ticketSPId).then(setComments).catch(console.error);
        }, 5000);
        return () => clearInterval(intervalId);
    }, [ticketSPId]);

    const loadData = async () => {
        try {
            const all = await spService.getAllTickets();
            const filtered = all.filter((t: any) => t.Id === ticketId || t.Reference === ticketId);
            if (filtered.length > 0) {
                const target = filtered[0];
                setTicket(target);
                const ticketComments = await spService.getComments(target.Id);
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
            console.error('Error updating status', error);
            alert('Failed to update ticket status.');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAddComment = async () => {
        if (!comment.trim()) return;
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
            
            await spService.addComment(ticket.Id, newComment);
            
            setTimeout(() => {
                loadData().catch(e => console.error(e));
            }, 1000);
        } catch (error) {
            console.error("Error adding comment", error);
            alert("Failed to post comment. Please verify the 'ticket_comments' list exists in SharePoint.");
        } finally {
            setIsUpdating(false);
        }
    };

    if (!ticket) return <div className={styles.loading}>Loading Ticket Details...</div>;

    const statusClass =
        ticket.Status === 'In Progress' ? styles.inProgress :
        ticket.Status === 'Resolved' ? styles.resolved :
        ticket.Status === 'Awaiting Feedback' ? styles.awaitingFeedback :
        styles.pending;

    return (
        <div className={styles.helpdeskDashboard} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Header — identical structure to the Agent's header */}
            <header className={styles.searchHeader} style={{ padding: '24px 32px', textAlign: 'left', marginBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button
                            onClick={onBack}
                            style={{
                                background: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                color: 'white',
                                borderRadius: '10px',
                                padding: '8px 12px',
                                cursor: 'pointer',
                                fontSize: '1rem'
                            }}
                        >
                            <Icon iconName="Back" />
                        </button>
                        <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{ticket.Reference || `TK-${ticket.Id}`}</h2>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {ticket.Status !== 'Resolved' && (
                                <button
                                    disabled={isUpdating}
                                    onClick={() => handleStatusChange('Resolved')}
                                    style={{
                                        background: '#dcfce7',
                                        color: '#166534',
                                        border: 'none',
                                        padding: '8px 16px',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        fontSize: '0.9rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        opacity: isUpdating ? 0.6 : 1
                                    }}
                                >
                                    <Icon iconName="CheckMark" />
                                    Mark as Resolved
                                </button>
                            )}
                            <span className={`${styles.status} ${statusClass}`}>
                                {ticket.Status || 'Pending'}
                            </span>
                        </div>
                </div>
            </header>

            {/* Body — same detailView grid as Agent */}
            <div className={styles.detailView}>

                {/* Main Content */}
                <div className={styles.mainContent}>
                    <div className={styles.section} style={{ marginBottom: '24px' }}>
                        <h3 style={{ border: 'none', marginBottom: '8px' }}>{ticket.Title}</h3>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>
                            Submitted on {new Date().toLocaleDateString()}
                        </p>

                        <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontWeight: 700, marginBottom: '8px', color: '#1e293b' }}>Description</div>
                            <p style={{ margin: 0, lineHeight: '1.6', color: '#334155' }}>
                                {ticket.Description || 'No description provided.'}
                            </p>
                        </div>

                        {/* Communication Feed */}
                        <div className={styles.communicationFeed}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                <Icon iconName="ChatList" style={{ color: '#f58220', fontSize: '20px' }} />
                                <h3 style={{ margin: 0, border: 'none' }}>Conversation</h3>
                            </div>

                            {comments.length === 0 && (
                                <p style={{ color: '#64748b', fontStyle: 'italic' }}>No messages yet. Start the conversation!</p>
                            )}

                            {comments.map((c: any, i: number) => {
                                const isMe = c.Author?.Title === currentUserTitle || c.Author?.Title === 'You';
                                return (
                                <div key={i} className={styles.comment} style={isMe ? { borderLeftColor: '#2563eb' } : {}}>
                                    <div className={styles.author}>
                                        <span>{isMe ? 'You' : (c.Author?.Title || 'User')}</span>
                                        <small style={{ fontWeight: 400, color: '#94a3b8' }}>
                                            {new Date(c.Created).toLocaleString()}
                                        </small>
                                    </div>
                                    <div className={styles.text}>{c.Commentaire || c.Text}</div>
                                </div>
                                );
                            })}

                            <div style={{ marginTop: '12px' }}>
                                <textarea
                                    placeholder="Type your reply here..."
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                                    <button
                                        onClick={handleAddComment}
                                        disabled={isUpdating || !comment.trim()}
                                        style={{
                                            background: '#F58220',
                                            color: 'white',
                                            border: 'none',
                                            padding: '10px 20px',
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            fontWeight: 600,
                                            fontSize: '0.95rem',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            opacity: (isUpdating || !comment.trim()) ? 0.6 : 1
                                        }}
                                    >
                                        <Icon iconName={isUpdating ? "Sync" : "Send"} />
                                        {isUpdating ? "Sending..." : "Send Message"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar — identical to Agent's Metadata panel */}
                <div className={styles.sidebar}>
                    <div className={styles.section}>
                        <h3 style={{ border: 'none', marginBottom: '16px' }}>Details</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#64748b' }}>Status</span>
                                <span className={`${styles.status} ${statusClass}`}>
                                    {ticket.Status || 'Pending'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#64748b' }}>Priority</span>
                                <span style={{ fontWeight: 600 }}>{ticket.Priorite || ticket.Priority || 'Normal'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#64748b' }}>Category</span>
                                <span style={{ fontWeight: 600 }}>{ticket.Categorie || ticket.Category || 'General'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#64748b' }}>Reference</span>
                                <span style={{ fontWeight: 600 }}>{ticket.Reference || `TK-${ticket.Id}`}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
