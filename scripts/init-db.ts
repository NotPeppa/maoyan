import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();
const { getDatabasePath, getDb } = await import('../db/index');

getDb();
console.log(`SQLite 数据库已就绪：${getDatabasePath()}`);
