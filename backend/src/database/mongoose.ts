import mongoose from "mongoose";

import { env } from "../config/env";
import { seedDefaultAdmin } from "./seed";

export const connectDatabase = async () => {
  await mongoose.connect(env.mongoUri);
  await seedDefaultAdmin();
};

mongoose.set("strictQuery", true);

