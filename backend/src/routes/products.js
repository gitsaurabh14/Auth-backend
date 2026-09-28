import { Router } from 'express';
import { body, param } from 'express-validator';
import Product from '../models/Product.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const idRule = [param('id').isMongoId().withMessage('Product id must be a valid MongoDB id.')];
const productRules = [
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Name must be 2–120 characters.'),
  body('description').trim().isLength({ min: 1, max: 2000 }).withMessage('Description is required and must be at most 2000 characters.'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number.').toFloat(),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative whole number.').toInt()
];
const productFields = ({ name, description, price, stock }) => ({ name, description, price, stock });

router.get('/', async (_req, res, next) => { try { res.json({ products: await Product.find().sort({ createdAt: -1 }).populate('owner', 'name email') }); } catch (error) { next(error); } });
router.get('/:id', idRule, validate, async (req, res, next) => { try { const product = await Product.findById(req.params.id).populate('owner', 'name email'); if (!product) return res.status(404).json({ message: 'Product not found.' }); res.json({ product }); } catch (error) { next(error); } });
router.post('/', authenticate, productRules, validate, async (req, res, next) => {
  try {
    const created = await Product.create({ ...productFields(req.body), owner: req.user.sub });
    const product = await created.populate('owner', 'name email');
    res.status(201).json({ product });
  } catch (error) { next(error); }
});
router.put('/:id', authenticate, idRule, productRules, validate, async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    if (product.owner.toString() !== req.user.sub) return res.status(403).json({ message: 'You may only edit your own products.' });
    Object.assign(product, productFields(req.body));
    await product.save();
    await product.populate('owner', 'name email');
    res.json({ product });
  } catch (error) { next(error); }
});
router.delete('/:id', authenticate, idRule, validate, async (req, res, next) => { try { const product = await Product.findById(req.params.id); if (!product) return res.status(404).json({ message: 'Product not found.' }); if (product.owner.toString() !== req.user.sub) return res.status(403).json({ message: 'You may only delete your own products.' }); await product.deleteOne(); res.status(204).end(); } catch (error) { next(error); } });
export default router;
