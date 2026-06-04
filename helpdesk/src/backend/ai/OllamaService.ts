export interface IMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export class OllamaService {
  private static OLLAMA_API_URL = 'http://localhost:3001/api/chat';
  private static MODEL_NAME = 'mistral:latest';

  public static async streamChat(
    currentMessages: IMessage[],
    onChunkReceived: (text: string) => void,
    onError: (error: string) => void
  ): Promise<string> {
    try {
      const apiMessages = currentMessages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

      const response = await fetch(this.OLLAMA_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.MODEL_NAME,
          messages: apiMessages,
          stream: true
        })
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
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
                onChunkReceived(fullText);
              }
            } catch (e) {
              // Ignore invalid JSON lines
            }
          }
        }
      }
      return fullText;
    } catch (error) {
      console.error('Error communicating with Ollama:', error);
      onError("Error connecting to Ollama. Please ensure Ollama is running locally and CORS is enabled (e.g., set OLLAMA_ORIGINS=\"*\").");
      return '';
    }
  }

  public static async getSummary(
    currentMessages: IMessage[]
  ): Promise<{ category: string; title: string; problem: string }> {
    try {
      const apiMessages = [
        ...currentMessages.map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        })),
        {
          role: 'user',
          content: "Analyze the conversation above. Choose the best category from (Hardware, Software, Network, Account, General Inquiry). Generate a clear, descriptive ticket TITLE that summarizes the issue (e.g., 'Broken Laptop Screen' or 'Email Login Error'). Extract the user's specific PROBLEM description (omit greetings, conversational filler, and solutions). Return EXACTLY in this format: CATEGORY: [category] TITLE: [descriptive title] PROBLEM: [concise description]"
        }
      ];

      const response = await fetch(this.OLLAMA_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.MODEL_NAME,
          messages: apiMessages,
          stream: false
        })
      });

      if (!response.ok) throw new Error('Summary fetch failed');
      
      const data = await response.json();
      const text = data.message?.content || '';
      
      const categoryMatch = text.match(/CATEGORY:\s*([\s\S]*?)(?=TITLE:|$)/i);
      const titleMatch = text.match(/TITLE:\s*([\s\S]*?)(?=PROBLEM:|$)/i);
      const problemMatch = text.match(/PROBLEM:\s*([\s\S]*)/i);
      
      const category = categoryMatch ? categoryMatch[1].trim() : 'General Inquiry';
      
      // Normalize category to match our options using a simple loop for ES5 compatibility
      const validCategories = ['Hardware', 'Software', 'Network', 'Account', 'General Inquiry'];
      let finalCategory = 'General Inquiry';
      for (let i = 0; i < validCategories.length; i++) {
        if (category.toLowerCase().indexOf(validCategories[i].toLowerCase()) > -1) {
          finalCategory = validCategories[i];
          break;
        }
      }

      return {
        category: finalCategory,
        title: titleMatch ? titleMatch[1].trim() : 'AI Assisted Ticket',
        problem: problemMatch ? problemMatch[1].trim() : text
      };
    } catch (error) {
      console.error('Error getting summary:', error);
      return { category: 'General Inquiry', title: 'AI Assisted Ticket', problem: 'Issue reported via AI Assistant' };
    }
  }
}
