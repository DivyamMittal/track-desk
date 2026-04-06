import Joi from "joi";
import { Router } from "express";

import { CommentVisibility } from "../../../shared";
import { asyncHandler } from "../../../common/middleware/async-handler";
import { requireAuth } from "../../../common/middleware/auth";
import { validate } from "../../../common/middleware/validate";
import { CommentModel } from "../../../database/models";
import { toPlainList, toPlain } from "../../../database/serializers";

const commentSchema = {
  body: Joi.object({
    body: Joi.string().required(),
    visibility: Joi.string()
      .valid(...Object.values(CommentVisibility))
      .default(CommentVisibility.SHARED),
  }),
};

export const commentsRouter = Router();

commentsRouter.get(
  "/:taskId",
  requireAuth,
  asyncHandler(async (request, response) => {
    const comments = await CommentModel.find({ taskId: request.params.taskId }).sort({ createdAt: -1 });
    response.json(toPlainList(comments));
  }),
);

commentsRouter.post(
  "/:taskId",
  requireAuth,
  validate(commentSchema),
  asyncHandler(async (request, response) => {
    const comment = await CommentModel.create({
      taskId: request.params.taskId,
      authorId: request.user!.id,
      body: request.body.body,
      visibility: request.body.visibility,
    });

    response.status(201).json(toPlain(comment));
  }),
);

