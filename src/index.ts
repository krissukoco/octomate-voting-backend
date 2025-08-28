import express from 'express';
import cors from 'cors';

import { loadConfig } from './config/index';
import { MongoClient } from 'mongodb';
import { UserRepositoryImpl } from './repository/user-repository';
import { VoteRepositoryImpl } from './repository/vote-repository';
import { VoteUsecaseImpl } from './usecase/vote-usecase';
import { AdminUsecaseImpl } from './usecase/admin-usecase';
import { AuthConfig } from './entity/auth';
import { AuthUsecaseImpl } from './usecase/auth-usecase';
import createAuthRouter from './router/auth-router';
import { authMiddleware, userTypeMiddleware } from './middleware/auth';
import { createAdminRouter } from './router/admin-router';
import { createVoteRouter } from './router/vote-router';
import { APIErrorResponse } from './schema/response';

async function run() {
  try {
    const cfg = loadConfig();

    const authConfig: AuthConfig = { ...cfg.auth };

    const mongoClient = new MongoClient(cfg.mongodb.url);
    const db = mongoClient.db(cfg.mongodb.database);

    // Repository
    const userRepo = new UserRepositoryImpl(db);
    const voteRepo = new VoteRepositoryImpl(db);

    // Usecases
    const voteUc = new VoteUsecaseImpl(voteRepo);
    const adminUc = new AdminUsecaseImpl(authConfig, userRepo, voteRepo);
    const authUc = new AuthUsecaseImpl(authConfig, userRepo);

    // Middlewares
    const authMw = authMiddleware(authConfig.jwtSecret);
    const adminMw = userTypeMiddleware('ADMIN');
    const userMw = userTypeMiddleware('USER');

    // Routers
    const authRouter = createAuthRouter(authConfig, authMw, authUc);
    const adminRouter = createAdminRouter(adminUc);
    const voteRouter = createVoteRouter(voteUc);
    
    const app = express();
    
    app.use(express.json());
    app.use(cors());
    
    app.use('/auth', authRouter);
    app.use('/admin', authMw, adminMw, adminRouter);
    app.use('/vote', authMw, userMw, voteRouter);
    
    app.use((_, res) => {
      res.status(404).json(new APIErrorResponse({
        code: 20004,
        message: 'Not Found',
        details: [],
      }))
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
