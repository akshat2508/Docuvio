// app.js
import express from 'express';
import cors from 'cors';

import webhookRoutes from './routes/webhook.routes.js';
import printSessionRoutes from "./routes/printSession.routes.js";
import authRoutes from './routes/auth.routes.js';
import studentRoutes from './routes/student.routes.js';
import shopRoutes from './routes/shop.routes.js';
import orderRoutes from './routes/order.routes.js';
import fileRoutes from './routes/file.routes.js';
import documentRoutes from './routes/document.routes.js';
import printOptionRoutes from './routes/printOptions.routes.js';
import printOptionsRoutes from './routes/printOptions.routes.js';
import paperTypeRoutes from './routes/paperType.routes.js';
import colorModeRoutes from './routes/colorMode.routes.js';
import finishTypeRoutes from './routes/finishType.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import errorMiddleware from './middleware/error.middleware.js';
import adminRoutes from "./routes/admin.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config/env.js";
import ApiError from './utils/ApiError.js';
import morgan from 'morgan';
import requestIdMiddleware from './middleware/requestId.middleware.js';
const app = express();

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,

  handler: (req, res, next) => {
    next(new ApiError(429, "Too many requests. Please slow down."));
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: "Too many login attempts. Please try again later."
  }
});

const pollingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12000
});

app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        config.frontendUrl,
        config.frontendUrl1
      ];

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true
  })
);
app.use(requestIdMiddleware);
morgan.token("id", (req) => req.id);

app.use(
  morgan(":id :method :url :status :response-time ms")
);// ✅ HEALTH CHECK (KEEP ALIVE)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

//  ✅ WEBHOOKS FIRST (raw body)
app.use('/api/webhooks', webhookRoutes);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  "/api/print-sessions",
  printSessionRoutes
);
app.use('/api/auth',authLimiter, authRoutes);
app.use("/api/auth", authRoutes);
app.use('/api/students',pollingLimiter, studentRoutes);
app.use('/api/shops',pollingLimiter, shopRoutes);
app.use('/api/orders',pollingLimiter, orderRoutes);
app.use('/api/files',apiLimiter, fileRoutes);
app.use('/api/documents',apiLimiter, documentRoutes);
// app.use('/api', printOptionRoutes);
app.use('/api/print-options', printOptionsRoutes);
app.use('/api/shops', paperTypeRoutes);
app.use('/api/shops', colorModeRoutes);
app.use('/api/shops', finishTypeRoutes);
app.use('/api/payments',apiLimiter, paymentRoutes);
app.use('/api/admin',apiLimiter,adminRoutes);
app.use("/api/notifications",pollingLimiter, notificationRoutes);

app.use(errorMiddleware);

export default app;
