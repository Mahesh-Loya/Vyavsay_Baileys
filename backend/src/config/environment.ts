import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

export const config = {
  PORT: parseInt(process.env.PORT || '3002', 10),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // AI — GPT-4o via Azure
  GITHUB_PAT: process.env.GITHUB_PAT || '',

  // Baileys auth sessions directory
  AUTH_SESSIONS_DIR: process.env.AUTH_SESSIONS_DIR || './auth_sessions',
};

// Validate critical env vars
const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GITHUB_PAT'];
for (const key of required) {
  if (!config[key as keyof typeof config]) {
    console.error(`❌ Missing required env var: ${key}`);
    process.exit(1);
  }
}
