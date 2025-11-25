import { PrismaClient } from '@prisma/client'

// 创建 Prisma Client 单例
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

// 优雅关闭
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

export default prisma
