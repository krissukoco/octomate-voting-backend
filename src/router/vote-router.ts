import express from 'express';
import { VoteUsecase } from "../usecase/vote-usecase";
import { handleError } from '../schema/response';
import { validate } from '../schema/validation';
import { createVoteSchema } from '../schema/vote';

export function createVoteRouter(
  voteUc: VoteUsecase,
) {
  const router = express.Router();

  router.get(
    '/current',
    async(req, res) => {
      try {
        const v = await voteUc.getCurrentVote(res.locals.auth.sub);
        return res.status(200).json({
          currentVote: v,
        })
      } catch(e) {
        handleError(res, e)
      }
    }
  )

  router.get(
    '/options',
    async(req, res) => {
      try {
        const resp = await voteUc.getOptions();
        return res.status(200).json({
          list: resp,
        })
      } catch(e) {
        handleError(res, e);
      }
    }
  )

  router.post(
    '/',
    validate({ body: createVoteSchema }),
    async(req, res) => {
      try {
        const id = await voteUc.vote(res.locals.auth.sub, req.body.name);
        return res.status(201).json({
          id,
        })
      } catch(e) {
        handleError(res, e);
      }
    }
  )

  return router;
}