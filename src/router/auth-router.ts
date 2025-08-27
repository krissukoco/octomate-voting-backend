import express from 'express';
import { AuthUsecase } from '../usecase/auth-usecase';

export default function createAuthRouter(
  authUc: AuthUsecase,
) {
  const router = express.Router();
  
  router.post('/user/login', (req, res) => {
    return res.json({
      'ok': true,
    })
  })

  return router;
}