import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import cors from 'cors';
import { GoogleGenAI } from "@google/genai"; // Импорт новой библиотеки
import { addMessage, getHistory } from './db.js';

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// === Настройка Gemini ===
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// === Функция обращения к Gemini ===
const askAI = async (currentPrompt) => {
  try {
    // 1. Получаем контекст: последние 20 сообщений из БД
    // Нам нужно получить их, чтобы бот понимал, о чем шла речь
    const dbHistory = await getHistory(); // Эта функция у нас возвращает старые -> новые
    
    // 2. Преобразуем формат Supabase в формат Gemini
    // Gemini ждет массив: [{ role: 'user'|'model', parts: [{ text: '...' }] }]
    const historyForGemini = dbHistory.slice(-20).map(msg => ({
      role: msg.isAi ? 'model' : 'user',
      parts: [{ 
        // Добавляем имя юзера в текст, чтобы бот знал, кто есть кто в команде
        text: msg.isAi ? msg.text : `${msg.user}: ${msg.text}` 
      }]
    }));

    // 3. Создаем чат-сессию
    const chat = genAI.chats.create({
      model: "gemini-2.5-flash",
      history: historyForGemini,
      config: {
        temperature: 0.7, // Креативность (0.0 - робот, 1.0 - фантазер)
        systemInstruction: "Ты полезный AI-ассистент в командном чате. Твои ответы должны быть краткими, четкими и полезными для работы. Ты видишь сообщения в формате 'Имя: Текст'.",
      },
    });

    // 4. Отправляем вопрос
    const result = await chat.sendMessage({
      message: currentPrompt
    });

    return result.text;

  } catch (error) {
    console.error("Gemini Error:", error);
    return "Извини, произошла ошибка при связи с AI мозгом.";
  }
};

wss.on('connection', async (ws) => {
  console.log('Client connected');

  // Отправляем историю при входе
  const history = await getHistory();
  ws.send(JSON.stringify({ type: 'history', data: history }));

  ws.on('message', async (messageRaw) => {
    try {
      const messageData = JSON.parse(messageRaw);
      
      // 1. Сохраняем сообщение юзера
      const savedUserMsg = await addMessage(
        messageData.user || 'Anon', 
        messageData.text, 
        false
      );
      if (savedUserMsg) broadcast(savedUserMsg);

      // 2. Логика AI
      if (messageData.text.toLowerCase().startsWith('@ai')) {
        const prompt = messageData.text.replace(/^@ai/i, '').trim();
        
        // Спрашиваем Gemini
        const aiResponseText = await askAI(prompt);
        
        // Сохраняем ответ бота
        const savedAiMsg = await addMessage(
          'Gemini 2.5', // Имя бота
          aiResponseText, 
          true
        );
        if (savedAiMsg) broadcast(savedAiMsg);
      }
    } catch (e) {
      console.error('Socket Error:', e);
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