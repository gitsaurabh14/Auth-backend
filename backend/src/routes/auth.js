import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body } from 'express-validator';
import User from '../models/User.js';
import { config } from '../config.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { hashToken, makeAccessToken, makeRefreshToken, refreshCookieOptions } from '../utils/tokens.js';

const router = Router();
const registerRules = [body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters.'), body('email').isEmail().normalizeEmail().withMessage('A valid email is required.'), body('password').isStrongPassword().withMessage('Password must be at least 8 characters and include upper, lower, number, and symbol.'), body('confirmPassword').custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match.')];
const loginRules = [body('email').isEmail().normalizeEmail().withMessage('A valid email is required.'), body('password').notEmpty().withMessage('Password is required.')];

router.post('/register', registerRules, validate, async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (await User.exists({ email })) return res.status(409).json({ message: 'An account with that email already exists.' });
    const user = await User.create({ name, email, password: await bcrypt.hash(password, 12) });
    res.status(201).json({ user: user.publicProfile() });
  } catch (error) { next(error); }
});

router.post('/login', loginRules, validate, async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user || !(await bcrypt.compare(req.body.password, user.password))) return res.status(401).json({ message: 'Invalid email or password.' });
    const refreshToken = makeRefreshToken(user);
    user.refreshTokenHash = hashToken(refreshToken);
    await user.save();
    res.cookie('refreshToken', refreshToken, refreshCookieOptions).json({ accessToken: makeAccessToken(user), user: user.publicProfile() });
  } catch (error) { next(error); }
});

router.post('/refresh-token', async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: 'Refresh token required.' });
    const payload = jwt.verify(token, config.refreshSecret);
    const user = await User.findById(payload.sub);
    if (!user || !user.refreshTokenHash || user.refreshTokenHash !== hashToken(token)) return res.status(403).json({ message: 'Refresh token has been revoked.' });
    const nextRefresh = makeRefreshToken(user); // rotate so the old token cannot be reused
    user.refreshTokenHash = hashToken(nextRefresh);
    await user.save();
    res.cookie('refreshToken', nextRefresh, refreshCookieOptions).json({ accessToken: makeAccessToken(user) });
  } catch (error) { res.status(401).json({ message: 'Invalid or expired refresh token.' }); }
});

router.post('/logout', authenticate, async (req, res, next) => {
  try { await User.findByIdAndUpdate(req.user.sub, { refreshTokenHash: null }); res.clearCookie('refreshToken', { ...refreshCookieOptions, maxAge: undefined }).json({ message: 'Logged out.' }); } catch (error) { next(error); }
});
router.get('/me', authenticate, async (req, res, next) => { try { const user = await User.findById(req.user.sub); if (!user) return res.status(404).json({ message: 'User not found.' }); res.json({ user: user.publicProfile() }); } catch (error) { next(error); } });
export default router;
