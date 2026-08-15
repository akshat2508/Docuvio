import supabaseService from "../services/supabase.service.js";
import { successResponse, errorResponse } from "../utils/response.js";


// =========================================================
// SUPERVISOR DASHBOARD
// =========================================================

export const getSupervisorDashboard = async (req, res) => {
  try {
    const supervisorId = req.user.id;
    const organisationId = req.user.organisationId;

    const { data: shops, error } =
      await supabaseService.getShopsBySupervisor(
        supervisorId,
        organisationId
      );

    if (error) {
      return errorResponse(res, error.message, 400);
    }

    const shopIds = shops.map((shop) => shop.id);

    let ongoingOrders = 0;
    let todayOrders = 0;
    let todayRevenue = 0;

    if (shopIds.length > 0) {
      const { data: orders, error: ordersError } =
        await supabaseService.getSupervisorDashboardOrders(
          shopIds
        );

      if (ordersError) {
        return errorResponse(
          res,
          ordersError.message,
          400
        );
      }

      ongoingOrders = orders.filter(
        (order) =>
          ![
            "completed",
            "cancelled",
            "expired",
          ].includes(order.status)
      ).length;

      const today = new Date()
        .toISOString()
        .split("T")[0];

      const todayOrdersData = orders.filter(
        (order) =>
          order.created_at?.startsWith(today)
      );

      todayOrders = todayOrdersData.length;

      todayRevenue = todayOrdersData.reduce(
        (sum, order) =>
          sum + Number(order.total_price || 0),
        0
      );
    }

    const activeShops = shops.filter(
      (shop) => shop.is_active
    ).length;

    const closedShops =
      shops.length - activeShops;

    return successResponse(
      res,
      {
        supervisor: {
          id: req.user.id,
          name: req.user.appUser?.name,
          email: req.user.appUser?.email,
          organisation_id: organisationId,
        },

        stats: {
          totalShops: shops.length,
          activeShops,
          closedShops,
          ongoingOrders,
          todayOrders,
          todayRevenue,
        },

        shops,
      },
      "Supervisor dashboard fetched"
    );
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};


// =========================================================
// SHOPS
// =========================================================

export const getMyShops = async (req, res) => {
  try {
    const { data, error } =
      await supabaseService.getShopsBySupervisor(
        req.user.id,
        req.user.organisationId
      );

    if (error) {
      return errorResponse(res, error.message, 400);
    }

    return successResponse(
      res,
      data,
      "Supervisor shops fetched"
    );
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};


export const getMyShop = async (req, res) => {
  try {
    return successResponse(
      res,
      req.shop,
      "Shop fetched"
    );
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};


// =========================================================
// ORDERS
// =========================================================

export const getShopOrders = async (req, res) => {
  try {
    const { data, error } =
      await supabaseService.getSupervisorShopOrders(
        req.shop.id
      );

    if (error) {
      return errorResponse(res, error.message, 400);
    }

    return successResponse(
      res,
      data,
      "Shop orders fetched"
    );
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};


// =========================================================
// ANALYTICS
// =========================================================

export const getShopAnalytics = async (req, res) => {
  try {
    const { data, error } =
      await supabaseService.getSupervisorShopAnalytics(
        req.shop.id
      );

    if (error) {
      return errorResponse(res, error.message, 400);
    }

    return successResponse(
      res,
      data,
      "Shop analytics fetched"
    );
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};


// =========================================================
// SHOP STATUS
// =========================================================

export const updateShopStatus = async (req, res) => {
  try {
    const { is_active } = req.body;

    if (typeof is_active !== "boolean") {
      return errorResponse(
        res,
        "is_active must be a boolean",
        400
      );
    }

    const { data, error } =
      await supabaseService.updateSupervisorShopStatus(
        req.shop.id,
        req.user.id,
        req.user.organisationId,
        is_active
      );

    if (error) {
      return errorResponse(res, error.message, 400);
    }

    return successResponse(
      res,
      data,
      "Shop status updated"
    );
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};


// =========================================================
// ACCEPTING ORDERS
// =========================================================

export const updateShopAcceptingOrders = async (
  req,
  res
) => {
  try {
    const { is_accepting_orders } = req.body;

    if (
      typeof is_accepting_orders !== "boolean"
    ) {
      return errorResponse(
        res,
        "is_accepting_orders must be a boolean",
        400
      );
    }

    const { data, error } =
      await supabaseService
        .updateSupervisorShopAcceptingOrders(
          req.shop.id,
          req.user.id,
          req.user.organisationId,
          is_accepting_orders
        );

    if (error) {
      return errorResponse(res, error.message, 400);
    }

    return successResponse(
      res,
      data,
      "Shop accepting-orders status updated"
    );
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};