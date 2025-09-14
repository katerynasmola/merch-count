// Supabase Configuration
// Замініть на ваші реальні значення з Supabase Dashboard

export const SUPABASE_CONFIG = {
  // URL вашого Supabase проекту
  url: 'https://your-project-id.supabase.co',
  
  // Service Role Key (для серверних функцій)
  serviceRoleKey: 'your-service-role-key-here',
  
  // Anon Key (для клієнтських функцій)
  anonKey: 'your-anon-key-here'
};

// Функція для отримання конфігурації
export function getSupabaseConfig() {
  // Спочатку перевіряємо змінні середовища (для Netlify)
  if (typeof process !== 'undefined' && process.env) {
    return {
      url: process.env.SUPABASE_URL || SUPABASE_CONFIG.url,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE || SUPABASE_CONFIG.serviceRoleKey,
      anonKey: process.env.SUPABASE_ANON_KEY || SUPABASE_CONFIG.anonKey
    };
  }
  
  // Для клієнтського коду
  return SUPABASE_CONFIG;
}
