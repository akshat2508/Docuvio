import express from "express";

import authMiddleware from "../middleware/auth.middleware.js";
import requireRole from "../middleware/role.middleware.js";
import {
  startPrintSession,
  getCustomerSession,
  submitCustomerDetails,
  customerHeartbeat,
  getLiveSessions,
  getVendorSession,
  vendorHeartbeat,
  updatePrintSessionStatus,
  setPrintSessionQuote,
  connectPrintSession,
   startFileUpload,
  uploadSessionFile,
  getSessionFiles,
  getSessionFileUrl,
} from "../controllers/printSession.controller.js";
import upload from "../middleware/upload.middleware.js";

import {
  printSessionAuth,
} from "../middleware/printSession.middleware.js";

const router = express.Router();


// ============================================================
// CUSTOMER / PUBLIC
// ============================================================

// Permanent QR code → create temporary print session
router.post(
  "/shop/:publicCode/start",
  startPrintSession
);

router.post(
  "/session/:sessionToken/connect",
  connectPrintSession
);
// Customer retrieves session
router.get(
  "/session/:sessionToken",
  getCustomerSession
);


// Customer submits name + phone
router.patch(
  "/session/:sessionToken/customer",
  submitCustomerDetails
);

router.post(
  "/session/:sessionToken/files/start",
  startFileUpload
);

router.post(
  "/session/:sessionToken/files",
  upload.single("file"),
  uploadSessionFile
);

router.get(
  "/session/:sessionToken/files",
  getSessionFiles
);

router.get(
  "/files/:fileId/url",
  getSessionFileUrl
);
// Customer heartbeat
router.post(
  "/session/:sessionToken/heartbeat",
  customerHeartbeat
);


// ============================================================
// VENDOR
// ============================================================

// All active sessions belonging to logged-in shop owner
router.get(
  "/vendor/live",
  authMiddleware,
  requireRole("shop_owner"),
  getLiveSessions
);


// Get one session
router.get(
  "/vendor/:sessionId",
  authMiddleware,
  requireRole("shop_owner"),
  getVendorSession
);


// Vendor heartbeat
router.post(
  "/vendor/:sessionId/heartbeat",
  authMiddleware,
  requireRole("shop_owner"),
  vendorHeartbeat
);


// Vendor changes session state
router.patch(
  "/vendor/:sessionId/status",
  authMiddleware,
  requireRole("shop_owner"),
  updatePrintSessionStatus
);


// Vendor enters final amount
router.post(
  "/vendor/:sessionId/quote",
  authMiddleware,
  requireRole("shop_owner"),
  setPrintSessionQuote
);


export default router;