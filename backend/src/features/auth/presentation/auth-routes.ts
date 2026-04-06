import { Router } from "express";

import { asyncHandler } from "../../../common/middleware/async-handler";
import { requireAuth } from "../../../common/middleware/auth";
import { validate } from "../../../common/middleware/validate";
import { authService } from "../application/auth-service";
import { loginSchema } from "./auth-validation";

export const authRouter = Router();

authRouter.post(
  "/login",
  validate(loginSchema),
  asyncHandler(async (request, response) => {
    response.json(await authService.login(request.body.email, request.body.password));
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (request, response) => {
    response.json(await authService.me(request.user!.id));
  }),
);

authRouter.post("/logout", (_request, response) => {
  response.status(204).send();
});
