import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import cors from 'cors';

// Настройка Express
const app = express();
app.use(cors()); // Разрешаем CORS, чтобы React мог стучаться к серверу

// Создаем HTTP сервер на базе Express
const server = http.createServer(app);

// Подключаем WebSocket сервер к тому же порту
const wss = new WebSocketServer({ server });

// === Временная база данных (в памяти) ===
// Тут будем хранить все сообщения, пока сервер работает
const messageHistory = [];

// === Функция фейкового AI ===
// Имитирует задержку и ответ. Позже сюда подключим реальный API.
const askAI = async (prompt) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`[AI Mock]: Я подумал над твоим вопросом "${prompt}" и вот мой ответ.`);
    }, 1500); // Думает 1.5 секунды
  });
};

// === Логика WebSocket ===
wss.on('connection', (ws) => {
  console.log('Client connected');

  // 1. При подключении сразу отправляем историю чата новому пользователю
  ws.send(JSON.stringify({ type: 'history', data: messageHistory }));

  // 2. Слушаем сообщения от клиента
  ws.on('message', async (messageRaw) => {
    try {
      // Парсим пришедшие данные
      const messageData = JSON.parse(messageRaw);
      
      // Формируем объект сообщения пользователя
      const userMsg = {
        id: Date.now(),
        user: messageData.user || 'Anonymous',
        text: messageData.text,
        isAi: false,
        timestamp: new Date().toISOString()
      };
      
      // Сохраняем в историю и рассылаем всем
      messageHistory.push(userMsg);
      broadcast(userMsg);

      // 3. Проверяем, нужно ли отвечать AI (если текст начинается с @ai)
      if (messageData.text.toLowerCase().startsWith('@ai')) {
        // Убираем "@ai" из текста запроса
        const prompt = messageData.text.replace(/^@ai/i, '').trim();
        
        // Ждем ответ от функции askAI
        const aiResponseText = await askAI(prompt);
        
        // Формируем сообщение от бота
        const aiMsg = {
          id: Date.now() + 1, // +1 чтобы ID отличался
          user: 'AI Assistant',
          text: aiResponseText,
          isAi: true,
          timestamp: new Date().toISOString()
        };

        // Сохраняем и рассылаем ответ бота
        messageHistory.push(aiMsg);
        broadcast(aiMsg);
      }

    } catch (e) {
      console.error('Ошибка обработки сообщения: ', e);
    }
  });

  ws.on('close', () => console.log('Client disconnected'));
});

// === Функция рассылки (Broadcast) ===
// Отправляет сообщение всем подключенным клиентам
const broadcast = (data) => {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // 1 = Соединение открыто
      client.send(JSON.stringify({ type: 'message', data }));
    }
  });
};

// Запуск сервера
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`✅ Server started on http://localhost:${PORT}`);
  console.log(`✅ WebSocket ready on ws://localhost:${PORT}`);
});