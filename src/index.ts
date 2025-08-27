import express from 'express';
import { loadConfig } from './config/index';

import authRouter from './router/auth-router';

async function run() {
  try {
    const cfg = loadConfig();
    
    const app = express();
    
    app.use(express.json());
    
    app.use('/auth', authRouter);
    
    app.use((_, res) => {
      res.status(404).json({
        code: 20004,
        message: 'Not Found',
      })
    })
    
    app.listen(cfg.port, () => {
      console.info(`Server started on port ${cfg.port}`);
    })

    process.on('SIGINT', () => {
      console.info('Shutting down app...');
      process.exit(0);
    })

  } catch(e) {
    console.error('Error initializing app: ', e);
    process.exit(1);
  }
}

run();
