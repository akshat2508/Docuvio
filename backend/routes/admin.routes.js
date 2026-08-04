import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import requireRole from "../middleware/role.middleware.js";
import { adminGetOrganisations , getShopsByOrganisation , toggleShopStatus , getOrganisationAnalytics , getShopAnalytics , getShopOrders,
  // paper
  getShopPaperTypes,
  addShopPaperType,
  toggleShopPaperType,

  // color
  getShopColorModes,
  addShopColorMode,
  toggleShopColorMode,

  // finish
  getShopFinishTypes,
  addShopFinishType,
  toggleShopFinishType,

  createShopDraft,
  inviteVendor

} from "../controllers/admin.controller.js";

const router = express.Router();

router.get(
  "/organisations",
  authMiddleware,
  requireRole("admin"),
  adminGetOrganisations
);


router.get(
  "/organisations/:orgId/shops",
  authMiddleware,
  requireRole("admin"),
  getShopsByOrganisation
);

router.patch(
  "/shops/:shopId/status",
  authMiddleware,
  requireRole("admin"),
  toggleShopStatus
);

router.post(
  "/shops/:shopId/invite",
  authMiddleware,
  requireRole("admin"),
  inviteVendor
);

router.get(
  "/analytics/:organisationId",
  authMiddleware,
  requireRole("admin"),
  getOrganisationAnalytics
);
router.get(
  "/shops/:shopId/analytics",
  authMiddleware,
  requireRole("admin"),
  getShopAnalytics
);

router.get(
  "/shops/:shopId/orders",
  authMiddleware,
  requireRole("admin"),
  getShopOrders
);

// PAPER
router.get(
  "/shops/:shopId/paper-types",
  authMiddleware,
  requireRole("admin"),
  getShopPaperTypes
);

router.post(
  "/shops/:shopId/paper-types",
  authMiddleware,
  requireRole("admin"),
  addShopPaperType
);

router.patch(
  "/paper-types/:id/toggle",
  authMiddleware,
  requireRole("admin"),
  toggleShopPaperType
);

// COLOR
router.get(
  "/shops/:shopId/color-modes",
  authMiddleware,
  requireRole("admin"),
  getShopColorModes
);

router.post(
  "/shops/:shopId/color-modes",
  authMiddleware,
  requireRole("admin"),
  addShopColorMode
);

router.patch(
  "/color-modes/:id/toggle",
  authMiddleware,
  requireRole("admin"),
  toggleShopColorMode
);

// FINISH
router.get(
  "/shops/:shopId/finish-types",
  authMiddleware,
  requireRole("admin"),
  getShopFinishTypes
);

router.post(
  "/shops/:shopId/finish-types",
  authMiddleware,
  requireRole("admin"),
  addShopFinishType
);

router.patch(
  "/finish-types/:id/toggle",
  authMiddleware,
  requireRole("admin"),
  toggleShopFinishType
);

router.post(
  "/shops",
  authMiddleware,
  requireRole("admin"),
  createShopDraft
);

export default router;
