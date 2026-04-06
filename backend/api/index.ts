import type { VercelRequest, VercelResponse } from "@vercel/node";

import { createApp } from "../src/app.js";
import { connectDatabase } from "../src/database/mongoose.js";

const app = createApp();

export default async function handler(request: VercelRequest, response: VercelResponse) {
  await connectDatabase();
  return app(request, response);
}
