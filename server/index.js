import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import cors from 'cors';
import { addMessage, getHistory } from './db.js'; // Импортируем функции БД

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Функция фейкового AI (оставляем пока как есть)
const askAI = async (prompt) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`[AI Database]: Я сохранил твой вопрос "${prompt}" в облако Supabase.`);
    }, 1000);
  });
};

wss.on('connection', async (ws) => {
  console.log('Client connected');

  // 1. ЗАГРУЖАЕМ ИСТОРИЮ ИЗ БД
  const history = await getHistory();
  ws.send(JSON.stringify({ type: 'history', data: history }));

  ws.on('message', async (messageRaw) => {
    const messageData = JSON.parse(messageRaw);
    
    // 2. СОХРАНЯЕМ СООБЩЕНИЕ ПОЛЬЗОВАТЕЛЯ В БД
    const savedUserMsg = await addMessage(
      messageData.user || 'Anon', 
      messageData.text, 
      false
    );

    if (savedUserMsg) {
      broadcast(savedUserMsg);
    }

    // Логика AI
    if (messageData.text.toLowerCase().startsWith('@ai')) {
      const prompt = messageData.text.replace(/^@ai/i, '').trim();
      const aiResponseText = await askAI(prompt);
      
      // 3. СОХРАНЯЕМ СООБЩЕНИЕ БОТА В БД
      const savedAiMsg = await addMessage(
        'AI Bot', 
        aiResponseText, 
        true
      );

      if (savedAiMsg) {
        broadcast(savedAiMsg);
      }
    }
  });
});

const broadcast = (data) => {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({ type: 'message', data }));
    }
  });
};

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});