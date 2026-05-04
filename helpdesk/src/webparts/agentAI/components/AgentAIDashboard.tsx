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


  const processMessage = async (text: string) => {
    const userMessage: IMessage = {
      id: Date.now().toString(),
      text: text,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => {
      const newMessages = [...prev, userMessage];
      callOllama(newMessages);
      return newMessages;
    });
    
    setIsTyping(true);
  };

  const callOllama = async (currentMessages: IMessage[]) => {
    try {
      const apiMessages = currentMessages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen2.5:latest',
          messages: apiMessages,
          stream: true
        })
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      const aiMessageId = Date.now().toString();
      setMessages(prev => [...prev, {
        id: aiMessageId,
        text: '',
        sender: 'ai',
        timestamp: new Date()
      }]);

      let done = false;
      let fullText = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim() !== '');
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.message?.content) {
                fullText += parsed.message.content;
                setMessages(prev => prev.map(msg => 
                  msg.id === aiMessageId ? { ...msg, text: fullText } : msg
                ));
              }
            } catch (e) {
              // Ignore invalid JSON lines
            }
          }
        }
      }
      
      setSuggestions([
        { id: 's9', title: 'Submit a Ticket', description: 'Talk to a human agent directly.' },
        { id: 's10', title: 'Browse FAQ', description: 'Common questions and answers.' }
      ]);
      setTicketMeta({ category: 'AI Assisted', priority: 'Medium', show: true });

    } catch (error) {
      console.error('Error communicating with Ollama:', error);
      const errorResponse: IMessage = {
        id: Date.now().toString(),
        text: "Error connecting to Ollama. Please ensure Ollama is running locally and CORS is enabled (e.g., set OLLAMA_ORIGINS=\"*\").",
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
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
