const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  console.log('Received chat request:', req.body);
  try {
    const { model, messages, stream } = req.body;

    const ollamaResponse = await fetch('http://127.0.0.1:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || 'mistral:latest',
        messages: messages,
        stream: stream !== undefined ? stream : true
      })
    });

    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();
      console.error('Ollama returned error:', ollamaResponse.status, errorText);
      return res.status(ollamaResponse.status).send(`Error from Ollama: ${errorText}`);
    }

    // Set headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Handle streaming using for await...of (compatible with Node 18+ native fetch)
    const reader = ollamaResponse.body.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    
    res.end();

  } catch (error) {
    console.error('Backend Exception:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`AI Backend Server running on http://localhost:${PORT}`);
});
