import express from 'express';
import path from 'path';
import logger from '../modules/logger';

const router = express.Router();

router.get('/', (_req, res) => {
  logger.info('[console] Home page accessed');
  logger.info('[logger] Home page accessed');
  res.sendFile(path.join(__dirname, '../templates/index.html'));
});

export = router;
