import { env } from "./config/env";
import { connectDatabase } from "./database/mongoose";
import { createApp } from "./app";

const start = async () => {
  await connectDatabase();

  const app = createApp();

  app.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`);
  });
};

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
