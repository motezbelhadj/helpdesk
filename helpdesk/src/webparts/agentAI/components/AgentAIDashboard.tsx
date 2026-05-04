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

interface ITicketSuggestion {
  category: string;
  priority: string;
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
    show: false
  });
  const [showSuccess, setShowSuccess] = React.useState(false);


  const processMessage = async (text: string) => {
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
        ).then(() => {
          setSuggestions([
            { id: 's9', title: 'Submit a Ticket', description: 'Talk to a human agent directly.' },
            { id: 's10', title: 'Browse FAQ', description: 'Common questions and answers.' }
          ]);
          setTicketMeta({ category: 'AI Assisted', priority: 'Medium', show: true });
          setIsTyping(false);
        });
      }, 0);
      
      return newMessages;
    });
    
    setIsTyping(true);
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    processMessage(inputValue);
    setInputValue('');
  };

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    if (query) {
      processMessage(query);
      // Optional: clear the query parameter from the URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const handleCreateTicket = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 5000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSendMessage();
  };

  return (
    <div className={`${styles.agentAIDashboard} ${props.isDarkTheme ? styles.dark : ''}`}>
      <div className={styles.header}>
        {props.dashboardPageUrl && (
          <div
            className={styles.backButton}
            onClick={() => { if (props.dashboardPageUrl) window.location.href = props.dashboardPageUrl; }}
            title="Back to Dashboard"
          >
            <Icon iconName="Back" />
          </div>
        )}
        <div className={styles.aiIcon}>✨</div>
        <h2>AgentAI Assistant</h2>
        <p>Smart helpdesk support, powered by pre-defined intelligence.</p>
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

        <div className={styles.sidebar}>
          <div className={styles.sidePanel}>
            <h3>Suggested Solutions</h3>
            {suggestions.length > 0 ? (
              suggestions.map(s => (
                <div key={s.id} className={styles.suggestionCard}>
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
      </div>
    </div>
  );
};

export default AgentAIDashboard;
