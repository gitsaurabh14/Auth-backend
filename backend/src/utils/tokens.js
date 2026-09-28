import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { config } from '../config.js';

export const makeAccessToken = (user) => jwt.sign({ sub: user._id, email: user.email }, config.accessSecret, { expiresIn: '15m' });
export const makeRefreshToken = (user) => jwt.sign({ sub: user._id }, config.refreshSecret, { expiresIn: '7d' });
export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
export const refreshCookieOptions = {
  httpOnly: true,
  secure: config.production,
  sameSite: config.production ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/auth'
};
