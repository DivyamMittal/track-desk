import type { VercelRequest, VercelResponse } from "@vercel/node";

import { createApp } from "../src/app";
import { connectDatabase } from "../src/database/mongoose";

const app = createApp();

export default async function handler(request: VercelRequest, response: VercelResponse) {
  await connectDatabase();
  return app(request, response);
}
