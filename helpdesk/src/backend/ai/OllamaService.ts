export interface IMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export class OllamaService {
  private static OLLAMA_API_URL = 'http://127.0.0.1:3001/api/chat';
  private static MODEL_NAME = 'qwen2.5:latest';

  public static async streamChat(
    currentMessages: IMessage[],
    onChunkReceived: (text: string) => void,
    onError: (error: string) => void
  ): Promise<void> {
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
    } catch (error) {
      console.error('Error communicating with Ollama:', error);
      onError("Error connecting to Ollama. Please ensure Ollama is running locally and CORS is enabled (e.g., set OLLAMA_ORIGINS=\"*\").");
    }
  }
}
