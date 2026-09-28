import mongoose from 'mongoose';
import app from './app.js';
import { config } from './config.js';

mongoose.connect(config.mongoUri).then(() => app.listen(config.port, () => console.log(`API listening on http://localhost:${config.port}`))).catch((error) => { console.error('MongoDB connection failed:', error.message); process.exit(1); });
