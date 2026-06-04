import * as React from 'react';
import styles from './AgentAIDashboard.module.scss';
import { IAgentAIDashboardProps } from './IAgentAIDashboardProps';
import { Icon, MessageBar, MessageBarType } from '@fluentui/react';
import { OllamaService, IMessage } from '../../../backend/ai/OllamaService';

interface ISuggestion {
  id: string;
  title: string;
  description: string;
}

interface IChatHistory {
  id: string;
  title: string;
  messages: IMessage[];
  timestamp: string; // Store as string for localStorage compatibility
}

interface ITicketSuggestion {
  category: string;
  priority: string;
  title: string;
  problem: string;
  show: boolean;
}

const AgentAIDashboard: React.FC<IAgentAIDashboardProps> = (props) => {
  const [messages, setMessages] = React.useState<IMessage[]>([
    {
      id: '1',
      text: "Hello! I'm your AI Assistant. How can I help you today?",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = React.useState('');
  const [isTyping, setIsTyping] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<ISuggestion[]>([]);
  const [ticketMeta, setTicketMeta] = React.useState<ITicketSuggestion>({
    category: 'General Inquiry',
    priority: 'Low',
    title: '',
    problem: '',
    show: false
  });
  const [showSuccess, setShowSuccess] = React.useState(false);
  
  // Ticket Modal States
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [modalTitle, setModalTitle] = React.useState('');
  const [modalCategory, setModalCategory] = React.useState('');
  const [modalPriority, setModalPriority] = React.useState('');
  const [modalDescription, setModalDescription] = React.useState('');
  const [isCreating, setIsCreating] = React.useState(false);
  const [isCopilot, setIsCopilot] = React.useState(false);
  const [currentTicketId, setCurrentTicketId] = React.useState<string | null>(null);
  const [chatHistory, setChatHistory] = React.useState<IChatHistory[]>([]);
  const [userRole, setUserRole] = React.useState<'Admin' | 'Agent' | 'User' | null>(null);



  const processMessage = async (text: string): Promise<void> => {
    const userMessage: IMessage = {
      id: Date.now().toString(),
      text: text,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => {
      const newMessages = [...prev, userMessage];
      
      const aiMessageId = (Date.now() + 1).toString();
      const initialAIMessage: IMessage = {
        id: aiMessageId,
        text: '',
        sender: 'ai',
        timestamp: new Date()
      };
      
      // Delay the service call slightly to ensure state updates sequentially
      setTimeout(() => {
        setMessages(curr => [...curr, initialAIMessage]);
        
        OllamaService.streamChat(
          newMessages,
          (chunk: string) => {
            setMessages(curr => curr.map(msg => 
              msg.id === aiMessageId ? { ...msg, text: chunk } : msg
            ));
          },
          (errorMsg: string) => {
            setMessages(curr => [...curr, {
              id: Date.now().toString(),
              text: errorMsg,
              sender: 'ai',
              timestamp: new Date()
            }]);
            setIsTyping(false);
          }
        ).then((finalAiText: string) => {
          setSuggestions([
            { id: 's9', title: 'Submit a Ticket', description: 'Talk to a human agent directly.' },
            { id: 's10', title: 'Browse FAQ', description: 'Common questions and answers.' }
          ]);
          
          setIsTyping(false);

          const finalMessages = [
            ...newMessages,
            {
              id: aiMessageId,
              text: finalAiText || "I couldn't generate a response.",
              sender: 'ai' as const,
              timestamp: new Date()
            }
          ];

          // Get AI Summary for the ticket
          void OllamaService.getSummary(finalMessages).then(summary => {
            setTicketMeta({ 
              category: summary.category, 
              priority: 'Medium', 
              title: summary.title,
              problem: summary.problem,
              show: true 
            });

            // Save to history
            saveToHistory(summary.title, finalMessages);
          });
        });
      }, 0);
      
      return newMessages;
    });
    
    setIsTyping(true);
  };

  const saveToHistory = (title: string, msgs: IMessage[]): void => {
    const newEntry: IChatHistory = {
      id: Date.now().toString(),
      title: title || 'New Conversation',
      messages: msgs,
      timestamp: new Date().toISOString()
    };

    setChatHistory(prev => {
      const updated = [newEntry, ...prev.filter(h => h.title !== title)].slice(0, 10);
      localStorage.setItem('helpdesk_ai_history', JSON.stringify(updated));
      return updated;
    });
  };

  const loadHistoryItem = (item: IChatHistory): void => {
    setMessages(item.messages);
    setTicketMeta({ ...ticketMeta, show: false }); // Reset meta for loaded chat
  };

  const startNewChat = (): void => {
    setMessages([{
      id: '1',
      text: "Hello! I'm your AI Assistant. How can I help you today?",
      sender: 'ai',
      timestamp: new Date()
    }]);
    setTicketMeta({ ...ticketMeta, show: false });
    setSuggestions([]);
  };

  const handleSendMessage = (): void => {
    if (!inputValue.trim()) return;
    void processMessage(inputValue);
    setInputValue('');
  };

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    const tid = params.get('ticketId');

    if (tid) {
      setIsCopilot(true);
      setCurrentTicketId(tid);
    }

    // Check user role
    void props.spService.getCurrentUserRole().then(role => {
      setUserRole(role);
    });


    // Load history from localStorage
    const saved = localStorage.getItem('helpdesk_ai_history');
    if (saved) {
      try {
        setChatHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }

    if (query) {
      void processMessage(query);
      // Optional: clear the query parameter from the URL (keep ticketId if needed for back button)
      // const newUrl = window.location.pathname;
      // window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const handleCreateTicket = (): void => {
    setModalTitle(ticketMeta.title || 'AI Assisted Ticket');
    setModalCategory(ticketMeta.category);
    setModalPriority(ticketMeta.priority);
    setModalDescription(ticketMeta.problem || '');
    setIsModalOpen(true);
  };

  const confirmCreateTicket = async (): Promise<void> => {
    setIsCreating(true);
    try {
      await props.spService.createTicket({
        Title: modalTitle,
        Categorie: modalCategory,
        Priorite: modalPriority,
        Description: modalDescription,
        Status: 'Pending'
      }, null);
      
      setIsModalOpen(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (error) {
      console.error('Failed to create ticket', error);
      alert('Failed to create ticket. Please check your SharePoint connection.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSendMessage();
  };


  return (
    <div className={`${styles.agentAIDashboard} ${props.isDarkTheme ? styles.dark : ''}`}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.brandLogo}>HelpDesk Pro</div>
        
        
        <div className={styles.navGroup}>
            {props.dashboardPageUrl && (
                <div className={styles.navItem} onClick={() => window.location.href = props.dashboardPageUrl!}>
                    <Icon iconName="ViewDashboard" />
                    <span>Dashboard</span>
                </div>
            )}
            <div className={`${styles.navItem} ${styles.active}`}>
                <Icon iconName="Robot" />
                <span>Agent AI</span>
            </div>
            {userRole === 'Agent' && props.agentPageUrl && (
                <div className={styles.navItem} onClick={() => window.location.href = props.agentPageUrl!}>
                    <Icon iconName="Headset" />
                    <span>Agent Human</span>
                </div>
            )}
            {userRole === 'Admin' && props.adminPageUrl && (
                <div className={styles.navItem} onClick={() => window.location.href = props.adminPageUrl!}>
                    <Icon iconName="Settings" />
                    <span>Admin Panel</span>
                </div>
            )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        {/* Top Header */}
        <header className={styles.topHeader}>
            <div className={styles.headerTitle}>Agent AI Assistant</div>
            

        </header>

        <div className={styles.contentWrapper}>
          <div className={styles.header}>
            {(props.dashboardPageUrl || isCopilot) && (
              <div
                className={styles.backButton}
                onClick={() => { 
                  if (isCopilot && props.agentPageUrl) {
                    window.location.href = `${props.agentPageUrl}${props.agentPageUrl.indexOf('?') > -1 ? '&' : '?'}ticketId=${currentTicketId}`;
                  } else if (props.dashboardPageUrl) {
                    window.location.href = props.dashboardPageUrl; 
                  }
                }}
                title={isCopilot ? "Back to Ticket" : "Back to Dashboard"}
              >
                <Icon iconName="Back" />
              </div>
            )}
            <h2>AgentAI Assistant</h2>
            <p>Smart helpdesk support, powered by pre-defined intelligence.</p>
            {!isCopilot && (
              <button className={styles.newChatBtn} onClick={startNewChat}>
                <Icon iconName="Add" /> New Chat
              </button>
            )}
          </div>

          {showSuccess && (
            <MessageBar
              messageBarType={MessageBarType.success}
              isMultiline={false}
              onDismiss={() => setShowSuccess(false)}
              dismissButtonAriaLabel="Close"
            >
              Ticket successfully created based on AI analysis!
            </MessageBar>
          )}

          <div className={styles.mainGrid}>
            <div className={styles.chatContainer}>
              <div className={styles.chatHistory}>
                {messages.map(msg => (
                  <div key={msg.id} className={`${styles.message} ${msg.sender === 'user' ? styles.user : styles.ai}`}>
                    {msg.text}
                  </div>
                ))}
                {isTyping && <div className={styles.typing}>AgentAI is thinking...</div>}
              </div>
              <div className={styles.inputArea}>
                <input
                  type="text"
                  placeholder="Describe your issue here..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <button onClick={handleSendMessage}>Send</button>
              </div>
            </div>

            {!isCopilot && (
              <div className={styles.rightSidebar}>
                <div className={styles.sidePanel}>
                  <h3><Icon iconName="History" /> Recent Chats</h3>
                  {chatHistory.length > 0 ? (
                    chatHistory.map(h => (
                      <div key={h.id} className={styles.suggestionCard} onClick={() => loadHistoryItem(h)}>
                        <div className={styles.title}>{h.title}</div>
                        <div className={styles.desc}>{new Date(h.timestamp).toLocaleDateString()}</div>
                      </div>
                    ))
                  ) : (
                    <p style={{ fontSize: '0.8rem', color: '#64748b' }}>No past conversations yet.</p>
                  )}
                </div>

                <div className={styles.sidePanel}>
                  <h3>Suggested Solutions</h3>
                  {suggestions.length > 0 ? (
                    suggestions.map(s => (
                      <div 
                        key={s.id} 
                        className={styles.suggestionCard}
                        onClick={() => {
                          if (s.title === 'Submit a Ticket' && props.dashboardPageUrl) {
                            const separator = props.dashboardPageUrl.indexOf('?') > -1 ? '&' : '?';
                            window.location.href = `${props.dashboardPageUrl}${separator}action=new`;
                          }
                        }}
                        style={s.title === 'Submit a Ticket' ? { cursor: 'pointer' } : {}}
                      >
                        <div className={styles.title}>{s.title}</div>
                        <div className={styles.desc}>{s.description}</div>
                      </div>
                    ))
                  ) : (
                    <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Start typing to see matching solutions.</p>
                  )}
                </div>

                {ticketMeta.show && (
                  <div className={styles.sidePanel}>
                    <h3>Ticket Assistance</h3>
                    <div className={styles.ticketAssistance}>
                      <div className={styles.field}>
                        <label>Suggested Category</label>
                        <div className={styles.value}>{ticketMeta.category}</div>
                      </div>
                      <div className={styles.field}>
                        <label>Suggested Priority</label>
                        <div className={styles.value} style={{
                          color: ticketMeta.priority === 'High' ? '#ef4444' :
                            ticketMeta.priority === 'Medium' ? '#f59e0b' : '#22c55e'
                        }}>
                          {ticketMeta.priority}
                        </div>
                      </div>
                      <button className={styles.createBtn} onClick={handleCreateTicket}>
                        Create Ticket with this info
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>


      </main>

      {/* Ticket Confirmation Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3><Icon iconName="Edit" /> Review Ticket Information</h3>
              <button onClick={() => setIsModalOpen(false)} className={styles.closeBtn}><Icon iconName="Cancel" /></button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.formField}>
                <label>Ticket Title</label>
                <input 
                  type="text" 
                  value={modalTitle} 
                  onChange={(e) => setModalTitle(e.target.value)} 
                  placeholder="Summarize the issue"
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label>Category</label>
                  <select value={modalCategory} onChange={(e) => setModalCategory(e.target.value)}>
                    <option value="Hardware">Hardware</option>
                    <option value="Software">Software</option>
                    <option value="Network">Network</option>
                    <option value="Account">Account</option>
                    <option value="AI Assisted">AI Assisted</option>
                    <option value="General Inquiry">General Inquiry</option>
                  </select>
                </div>
                <div className={styles.formField}>
                  <label>Priority</label>
                  <select value={modalPriority} onChange={(e) => setModalPriority(e.target.value)}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className={styles.formField}>
                <label>Description (AI Analysis)</label>
                <textarea 
                  value={modalDescription} 
                  onChange={(e) => setModalDescription(e.target.value)} 
                  rows={5}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setIsModalOpen(false)} disabled={isCreating}>Cancel</button>
              <button className={styles.confirmBtn} onClick={confirmCreateTicket} disabled={isCreating}>
                {isCreating ? <><Icon iconName="Sync" /> Creating...</> : 'Confirm & Create Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentAIDashboard;
