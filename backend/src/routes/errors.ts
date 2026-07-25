import { Router } from 'express';
import logger from '../config/logging';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { error, stack, componentStack, url, userAgent } = req.body;
    
    logger.error({
      error,
      stack,
      componentStack,
      url,
      userAgent
    }, 'Frontend error reported');
    
    res.status(200).json({ message: 'Error logged successfully' });
  } catch (error) {
    logger.error('Failed to log error:', error);
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to log error' } 
    });
  }
});

export default router;