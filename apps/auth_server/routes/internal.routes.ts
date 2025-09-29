import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../../../packages/models/user';
import { internalAuth } from 'middleware/internalAuthMiddleware';

const router: Router = Router();

router.use(internalAuth)

router.post('/validate-token', async (req, res) => {
  try {
    const { token } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_SECRET_ACCESS!) as any;
    const user = await User.findById(decoded.id)
      .select("firstName lastName email role isEmailVerified")
      .lean();

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        _id: decoded.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      }
    });
  } catch (error: any) {
    res.status(401).json({
      error: error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token'
    });
  }
});

export { router as internalRoutes };