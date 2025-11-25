import app from './app'
import { env } from './config/env'
// Updated CORS origin to match frontend port

// 启动服务器
const PORT = env.PORT

app.listen(PORT, () => {
  console.log('🚀 Jiebei Finance API Server Started!')
  console.log(`📡 Server running at: http://localhost:${PORT}`)
  console.log(`🌍 Environment: ${env.NODE_ENV}`)
  console.log(`🔗 CORS Origin: ${env.CORS_ORIGIN}`)
  console.log(`📝 Health check: http://localhost:${PORT}/health`)
  console.log('='.repeat(50))
})

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('\n👋 SIGINT received, shutting down gracefully')
  process.exit(0)
})
