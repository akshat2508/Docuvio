import cron from "node-cron";

import { runOrderExpiryCheck } from "./services/orderExpiry.service.js";

import {
  runPickupReminderCheck,
} from "./services/pickupReminder.service.js";

import app from "./app.js";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Existing order expiry job.
// DO NOT REMOVE OR MODIFY.
cron.schedule("*/5 * * * *", async () => {
  await runOrderExpiryCheck();
});

// Pickup reminder job.
// Runs every minute.
cron.schedule("* * * * *", async () => {
  try {
    await runPickupReminderCheck();
  } catch (error) {
    console.error(
      "Pickup reminder check failed:",
      error
    );
  }
});