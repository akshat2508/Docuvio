import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

/* Resolve directory for ES modules */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* Determine environment {checking deployment after changing the origin repo} */ 
const env = process.env.NODE_ENV || "development";

/* Choose correct env file */
const envFile =
  env === "production" ? ".env.production" : ".env.development";

/* Load environment variables */
dotenv.config({
  path: path.resolve(__dirname, `../${envFile}`),
});
console.log("Environment:", env);
console.log("Loaded ENV File:", envFile);

const requiredEnv = [
  "SUPABASE_URL",
  "SUPABASE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "B2_BUCKET_NAME",
  "B2_ENDPOINT",
  "B2_REGION",
  "B2_ACCESS_KEY",
  "B2_SECRET_KEY",
  "FRONTEND_URL"
];

for (const envVar of requiredEnv) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing environment variable: ${envVar}`);
    process.exit(1);
  }
}
/* Export centralized config */
export const config = {
  env,

  port: process.env.PORT || 5000,

  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  b2: {
    bucketName: process.env.B2_BUCKET_NAME,
    endpoint: process.env.B2_ENDPOINT,
    region: process.env.B2_REGION,
    accessKey: process.env.B2_ACCESS_KEY,
    secretKey: process.env.B2_SECRET_KEY,
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },

  resend: {
    apiKey: process.env.RESEND_API_KEY,
  },

  frontendUrl: process.env.FRONTEND_URL,
  frontendUrl1: process.env.FRONTEND_URL1,

  enableEmails: process.env.ENABLE_EMAILS === "true",
};