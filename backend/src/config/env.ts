import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

export const env = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3001',
}

// 验证必需的环境变量
if (!env.DATABASE_URL && env.NODE_ENV !== 'development') {
  console.warn('⚠️  DATABASE_URL is not set')
}
