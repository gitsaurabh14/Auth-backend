import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import { config } from './config.js';

const app = express();
app.use(cors({ origin: config.frontendOrigin, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use((req, res) => res.status(404).json({ message: `Route ${req.method} ${req.path} was not found.` }));
app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ message: 'Internal server error.' }); });
export default app;
