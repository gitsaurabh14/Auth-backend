import { validationResult } from 'express-validator';

export function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  res.status(400).json({ message: 'Validation failed.', errors: errors.array().map(({ path, msg }) => ({ field: path, message: msg })) });
}
