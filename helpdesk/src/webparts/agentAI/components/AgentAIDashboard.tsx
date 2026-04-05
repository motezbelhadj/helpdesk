import * as React from 'react';
import styles from './AgentAIDashboard.module.scss';
import { IAgentAIDashboardProps } from './IAgentAIDashboardProps';
import { Icon, MessageBar, MessageBarType } from '@fluentui/react';

interface IMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

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

  // Predefined knowledge base
  const knowledgeBase = [
    {
      keywords: ['password', 'login', 'access', 'account'],
      response: "I can help with account and password issues. Have you tried resetting it through the self-service portal?",
      suggestions: [
        { id: 's1', title: 'Reset Your Password', description: 'Step-by-step guide to reset your company password.' },
        { id: 's2', title: 'Unlock Account', description: 'How to unlock your account after too many failed attempts.' }
      ],
      category: 'Account Management',
      priority: 'Medium'
    },
    {
      keywords: ['printer', 'print', 'paper', 'toner'],
      response: "It sounds like a printer problem. Please check if the printer is online and has enough paper.",
      suggestions: [
        { id: 's3', title: 'Add Network Printer', description: 'How to connect to a new office printer.' },
        { id: 's4', title: 'Clear Paper Jam', description: 'Common solutions for paper jam issues.' }
      ],
      category: 'Hardware Support',
      priority: 'Low'
    },
    {
      keywords: ['vpn', 'network', 'internet', 'connection', 'slow'],
      response: "Connectivity issues can be frustrating. Let me analyze your network request.",
      suggestions: [
        { id: 's5', title: 'VPN Connection Guide', description: 'Configure your VPN for remote work.' },
        { id: 's6', title: 'Speed Test', description: 'Check your current internet connection speed.' }
      ],
      category: 'Network Services',
      priority: 'High'
    },
    {
      keywords: ['software', 'install', 'update', 'application', 'word', 'excel'],
      response: "I can assist with software installations and updates. Which application are you referring to?",
      suggestions: [
        { id: 's7', title: 'Software Catalog', description: 'Browse and request available software.' },
        { id: 's8', title: 'Update Office 365', description: 'Keep your productivity tools up to date.' }
      ],
      category: 'Software Support',
      priority: 'Medium'
    }
  ];

  const processMessage = (text: string) => {
    const userMessage: IMessage = {
      id: Date.now().toString(),
      text: text,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    // Simulated Logic
    setTimeout(() => {
      const lowerInput = userMessage.text.toLowerCase();
      let foundMatch = false;

      for (const item of knowledgeBase) {
        if (item.keywords.some(k => lowerInput.indexOf(k) !== -1)) {
          const aiResponse: IMessage = {
            id: (Date.now() + 1).toString(),
            text: item.response,
            sender: 'ai',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, aiResponse]);
          setSuggestions(item.suggestions);
          setTicketMeta({ category: item.category, priority: item.priority, show: true });
          foundMatch = true;
          break;
        }
      }

      if (!foundMatch) {
        const defaultResponse: IMessage = {
          id: (Date.now() + 1).toString(),
          text: "I'm not sure I understand. Could you please provide more details or choose a category below?",
          sender: 'ai',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, defaultResponse]);
        setSuggestions([
          { id: 's9', title: 'Submit a Ticket', description: 'Talk to a human agent directly.' },
          { id: 's10', title: 'Browse FAQ', description: 'Common questions and answers.' }
        ]);
        setTicketMeta({ category: 'Other', priority: 'Low', show: true });
      }

      setIsTyping(false);
    }, 1200);
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
