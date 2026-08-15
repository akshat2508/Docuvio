import express from "express";

import authMiddleware from "../middleware/auth.middleware.js";
import requireRole from "../middleware/role.middleware.js";
import requireSupervisorShopAccess from "../middleware/supervisorShop.middleware.js";

import {
  getSupervisorDashboard,
  getMyShops,
  getMyShop,
  getShopOrders,
  getShopAnalytics,
  updateShopStatus,
  updateShopAcceptingOrders,
} from "../controllers/supervisor.controller.js";

const router = express.Router();


// =========================================================
// SUPERVISOR DASHBOARD
// =========================================================

router.get(
  "/dashboard",
  authMiddleware,
  requireRole("supervisor"),
  getSupervisorDashboard
);


// =========================================================
// SUPERVISOR SHOPS
// =========================================================

router.get(
  "/shops",
  authMiddleware,
  requireRole("supervisor"),
  getMyShops
);


router.get(
  "/shops/:shopId",
  authMiddleware,
  requireRole("supervisor"),
  requireSupervisorShopAccess,
  getMyShop
);


// =========================================================
// SHOP ORDERS
// =========================================================

router.get(
  "/shops/:shopId/orders",
  authMiddleware,
  requireRole("supervisor"),
  requireSupervisorShopAccess,
  getShopOrders
);


// =========================================================
// SHOP ANALYTICS
// =========================================================

router.get(
  "/shops/:shopId/analytics",
  authMiddleware,
  requireRole("supervisor"),
  requireSupervisorShopAccess,
  getShopAnalytics
);


// =========================================================
// SHOP STATUS
// =========================================================

router.patch(
  "/shops/:shopId/status",
  authMiddleware,
  requireRole("supervisor"),
  requireSupervisorShopAccess,
  updateShopStatus
);


// =========================================================
// ACCEPTING ORDERS
// =========================================================

router.patch(
  "/shops/:shopId/accepting-orders",
  authMiddleware,
  requireRole("supervisor"),
  requireSupervisorShopAccess,
  updateShopAcceptingOrders
);


export default router;