import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Функция добавления сообщения
export const addMessage = async (user, text, isAi = false) => {
  const { data, error } = await supabase
    .from('messages')
    .insert([{ user_name: user, content: text, is_ai: isAi }])
    .select()
    .single(); // Возвращает созданный объект

  if (error) {
    console.error('Ошибка записи в БД:', error);
    return null;
  }
  
  // Приводим к формату, который ждет наш фронтенд
  return {
    id: data.id,
    user: data.user_name,
    text: data.content,
    isAi: data.is_ai,
    timestamp: data.created_at
  };
};

// Функция получения истории (последние 50 сообщений)
export const getHistory = async () => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true }) // Сначала старые
    .limit(50);

  if (error) {
    console.error('Ошибка чтения БД:', error);
    return [];
  }

  // Преобразуем данные из формата БД в формат нашего приложения
  return data.map(msg => ({
    id: msg.id,
    user: msg.user_name,
    text: msg.content,
    isAi: msg.is_ai,
    timestamp: msg.created_at
  }));
};