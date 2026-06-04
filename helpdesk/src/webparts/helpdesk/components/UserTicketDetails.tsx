import * as React from 'react';
import { useState, useEffect } from 'react';
import styles from './TicketDetail.module.scss';
import { SPService } from '../../../services/SPService';
import { ITicket, IComment } from '../../../models/types';
import { Icon, DefaultButton, PrimaryButton } from '@fluentui/react';
import { SLACountdown } from './SLACountdown';

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
 * Redesigned to match a clean flat premium design as per the user's mockup.
 */
export const UserTicketDetails: React.FC<IUserTicketDetailsProps> = ({ ticketId, onBack, spService }) => {
    const [ticket, setTicket] = useState<ITicket | null>(null);
    const [comment, setComment] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [comments, setComments] = useState<IComment[]>([]);
    const [currentUserTitle, setCurrentUserTitle] = useState<string>('');

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        spService.getCurrentUserProfile().then((user: { Title?: string }) => {
            if (user && user.Title) setCurrentUserTitle(user.Title);
        });
    }, []);

    const loadData = async (): Promise<void> => {
        try {
            const all = await spService.getAllTickets();
            const filtered = all.filter((t: ITicket) => t.Id.toString() === ticketId.toString() || t.Reference === ticketId);
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

    useEffect(() => {
        void loadData().catch(console.error);
    }, [ticketId]);

    const handleStatusChange = async (newStatus: string): Promise<void> => {
        setIsUpdating(true);
        try {
            if (ticket) {
                await spService.updateTicket(ticket.Id, { Status: newStatus });
                await loadData();
            }
        } catch (error) {
            console.error('Error updating status', error);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAddComment = async (): Promise<void> => {
        if (!comment.trim()) return;
        setIsUpdating(true);
        try {
            const newComment = comment;
            const optimisticComment = {
                Commentaire: newComment,
                Text: newComment,
                Created: new Date().toISOString(),
                Author: { Title: 'You' }
            } as IComment;
            setComments(prev => [...prev, optimisticComment]);
            setComment('');
            
            if (ticket) {
                await spService.addComment(ticket.Id, newComment);
            }
            
            setTimeout(() => {
                loadData().catch(e => console.error(e));
            }, 1000);
        } catch (error) {
            console.error("Error adding comment", error);
        } finally {
            setIsUpdating(false);
        }
    };

    if (!ticket) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Ticket Details...</div>;

    const formattedDate = new Date(ticket.Created).toLocaleDateString();
    const deadlineDate = ticket.DueDate ? new Date(ticket.DueDate) : spService.calculateDeadline(new Date(ticket.Created), ticket.Priorite || 'Normal');

    return (
        <div className={styles.ticketDetailContainer}>
            {/* Dark Header Bar */}
            <header className={styles.headerBar}>
                <div className={styles.headerLeft}>
                    <button className={styles.backBtn} onClick={onBack} title="Back">
                        <Icon iconName="Back" />
                    </button>
                    <div className={styles.ticketTitleGroup}>
                        <h2>{ticket.Reference || `TKT-2026-${ticket.Id}`}</h2>
                        <p>Internal Support Ticket</p>
                    </div>
                </div>
                <div className={styles.headerRight}>
                    {ticket.Status !== 'Resolved' && (
                        <DefaultButton
                            disabled={isUpdating}
                            onClick={() => handleStatusChange('Resolved')}
                            className={styles.resolveBtn}
                            onRenderIcon={() => <Icon iconName="CheckMark" />}
                        >
                            Mark as Resolved
                        </DefaultButton>
                    )}
                    <span className={styles.statusBadge}>{ticket.Status || 'Awaiting Feedback'}</span>
                    <SLACountdown targetDate={deadlineDate} isResolved={ticket.Status === 'Resolved'} />
                </div>
            </header>

            {/* Main Grid */}
            <div className={styles.mainGrid}>
                {/* Left Column: Description and Conversation */}
                <div className={styles.contentColumn}>
                    <div className={`${styles.whiteCard} ${styles.ticketInfo}`}>
                        <h2>{ticket.Title}</h2>
                        <span className={styles.timestamp}>Submitted on {formattedDate}</span>
                        
                        <div className={styles.descriptionBox}>
                            <div className={styles.descLabel}>Description</div>
                            <p>{ticket.Description || 'No description provided.'}</p>
                        </div>
                    </div>

                    <div className={styles.whiteCard}>
                        <h3><Icon iconName="ChatList" /> Conversation</h3>
                        <div className={styles.messageList}>
                            {comments.map((c, i) => {
                                const isMe = c.Author?.Title === currentUserTitle || c.Author?.Title === 'You';
                                return (
                                    <div key={i} className={`${styles.messageBubble} ${isMe ? styles.me : ''}`}>
                                        <div className={styles.messageHeader}>
                                            <span>{isMe ? 'You' : (c.Author?.Title || 'Support')}</span>
                                            <small>{new Date(c.Created).toLocaleString()}</small>
                                        </div>
                                        <div className={styles.messageText}>{c.Commentaire || c.Text}</div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className={styles.replyBox}>
                            <textarea
                                placeholder="Type your reply here..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                            />
                            <PrimaryButton
                                onClick={handleAddComment}
                                disabled={isUpdating || !comment.trim()}
                                className={styles.sendBtn}
                                onRenderIcon={() => <Icon iconName="Send" />}
                            >
                                {isUpdating ? "Sending..." : "Send Message"}
                            </PrimaryButton>
                        </div>
                    </div>
                </div>

                {/* Right Column: Metadata Details */}
                <div className={styles.sidebarColumn}>
                    <div className={styles.whiteCard}>
                        <h3><Icon iconName="Info" /> Details</h3>
                        <div className={styles.detailRow}>
                            <label>Status</label>
                            <span className={styles.statusBadge}>{ticket.Status || 'Awaiting Feedback'}</span>
                        </div>
                        <div className={styles.detailRow}>
                            <label>Priority</label>
                            <span className={styles.prioHigh}>{ticket.Priorite || 'High'}</span>
                        </div>
                        <div className={styles.detailRow}>
                            <label>Category</label>
                            <span>{ticket.Categorie || 'Hardware'}</span>
                        </div>
                        <div className={styles.detailRow}>
                            <label>Reference</label>
                            <span className={styles.refText}>{ticket.Reference || `TKT-2026-${ticket.Id}`}</span>
                        </div>

                        <div className={styles.deadlineBox}>
                            <span className={styles.deadlineLabel}>Resolution Deadline</span>
                            <div className={styles.deadlineValue}>
                                {deadlineDate.toLocaleString()}
                            </div>
                            <span className={styles.deadlineStatus}>Lapsed - Critical Priority</span>
                        </div>

                        <div className={styles.assignedPill}>
                            <div className={styles.dot} />
                            Assigned to: Support Lead
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
