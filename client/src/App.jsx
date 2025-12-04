import { useState, useEffect, useRef } from 'react';

function App() {
  // === Состояние (State) ===
  const [messages, setMessages] = useState([]); // Список всех сообщений
  const [input, setInput] = useState('');       // Текст в поле ввода
  // Генерируем случайное имя пользователя при загрузке
  const [username, setUsername] = useState('User_' + Math.floor(Math.random() * 1000));
  
  // === Ссылки (Refs) ===
  const socketRef = useRef(null);      // Храним соединение, чтобы оно не терялось
  const messagesEndRef = useRef(null); // Для автоскролла вниз

  // === 1. Подключение к серверу (при запуске) ===
  useEffect(() => {
    // Создаем подключение
    // Определяем протокол: если сайт на https, то ws должен быть wss (secure)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // В продакшене подключаемся к тому же хосту, где открыт сайт
    // В разработке (localhost) оставляем 3000
    const wsUrl = import.meta.env.DEV 
      ? 'ws://localhost:3000' 
      : `${protocol}//${window.location.host}`;

    socketRef.current = new WebSocket(wsUrl);

    // Когда подключились
    socketRef.current.onopen = () => {
      console.log('✅ Connected to WS Server');
    };

    // Когда пришло сообщение от сервера
    socketRef.current.onmessage = (event) => {
      const parsed = JSON.parse(event.data);

      if (parsed.type === 'history') {
        // Если сервер прислал историю - заменяем весь массив
        setMessages(parsed.data);
      } else if (parsed.type === 'message') {
        // Если новое сообщение - добавляем в конец
        setMessages((prev) => [...prev, parsed.data]);
      }
    };

    // Функция очистки (сработает, если закрыть вкладку/компонент)
    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, []);

  // === 2. Автоскролл ===
  // Срабатывает каждый раз, когда меняется массив messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // === 3. Отправка сообщения ===
  const sendMessage = (e) => {
    e.preventDefault(); // Чтобы страница не перезагружалась
    if (!input.trim()) return; // Не отправляем пустоту

    const messagePayload = {
      user: username,
      text: input
    };

    // Отправляем строку JSON на сервер
    socketRef.current.send(JSON.stringify(messagePayload));
    
    setInput(''); // Очищаем поле ввода
  };

  // === Рендер (Визуал) ===
  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white font-sans">
      
      {/* Шапка */}
      <header className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <h1 className="text-xl font-bold tracking-wide">Team AI Chat</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Никнейм:</span>
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)}
            className="bg-gray-700 text-sm px-2 py-1 rounded border border-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </header>

      {/* Область сообщений */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.user === username;
          
          return (
            <div 
              key={msg.id} 
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}
            >
              {/* Имя и время */}
              <div className="text-xs text-gray-400 mb-1 px-1 flex gap-2 items-center">
                <span className="font-bold text-gray-300">{msg.user}</span>
                <span>{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>

              {/* Пузырь сообщения */}
              <div 
                className={`max-w-[80%] px-4 py-2 rounded-2xl shadow-md text-sm md:text-base break-words ${
                  msg.isAi 
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tl-none border border-purple-400' // Стиль AI
                    : isMe 
                      ? 'bg-blue-600 text-white rounded-tr-none' // Мой стиль
                      : 'bg-gray-700 text-gray-200 rounded-tl-none' // Чужой стиль
                }`}
              >
                {msg.isAi && <span className="mr-2 text-lg">🤖</span>}
                {msg.text}
              </div>
            </div>
          );
        })}
        {/* Невидимый блок для скролла */}
        <div ref={messagesEndRef} />
      </main>

      {/* Футер с вводом */}
      <footer className="p-4 bg-gray-800 border-t border-gray-700">
        <form onSubmit={sendMessage} className="flex gap-3 max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Напиши сообщение... (используй @ai для бота)"
            className="flex-1 bg-gray-900 text-white px-4 py-3 rounded-xl border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
          />
          <button 
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg"
          >
            ➤
          </button>
        </form>
      </footer>
    </div>
  );
}

export default App;