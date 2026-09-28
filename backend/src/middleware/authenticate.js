import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function authenticate(req, res, next) {
  const [scheme, token] = (req.get('authorization') || '').split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ message: 'Authentication required.' });
  try {
    req.user = jwt.verify(token, config.accessSecret);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired access token.' });
  }
}
