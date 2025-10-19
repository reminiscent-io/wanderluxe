import express from 'express';
import tripPdfRoutes from './trip-pdf';

const router = express.Router();

router.use(tripPdfRoutes);

export default router;