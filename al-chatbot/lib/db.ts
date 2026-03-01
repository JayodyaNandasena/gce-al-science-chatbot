import mysql from 'mysql2/promise';
import {env} from "@/lib/config.js";

const pool = mysql.createPool({
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'al_chatbot',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

export default pool;
