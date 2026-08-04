// controllers/shop.controller.js
import supabaseService from '../services/supabase.service.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { STATUS_FLOW } from '../utils/orderStatusFlow.js';


export const getAllShops = async (req, res, next) => {
  try {
    const { data, error } = await supabaseService.getAllShops();

    if (error) {
      return errorResponse(res, error.message, 400);
    }

    return successResponse(res, data, 'Shops retrieved successfully');
  } catch (err) {
    next(err);
  }
};


export const getShopById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseService.getShopById(id);

    if (error) {
      return errorResponse(res, error.message, 404);
    }

    return successResponse(res, data, 'Shop retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const createShop = async (req, res, next) => {
  try {
    const shopData = req.body;

    const { data, error } = await supabaseService.createShop(shopData);

    if (error) {
      return errorResponse(res, error.message, 400);
    }

    return successResponse(res, data, 'Shop created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const updateShop = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabaseService.updateShop(id, updates);

    if (error) {
      return errorResponse(res, error.message, 400);
    }

    return successResponse(res, data, 'Shop updated successfully');
  } catch (error) {
    next(error);
  }
};

export const getShopOrders = async (req, res, next) => {
  try {
    const { id } = req.params;

    // ✅ extract token from header
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return errorResponse(res, 'Authorization token missing', 401);
    }

    const { data, error } =
      await supabaseService.getOrdersByShopId(id, token);

    if (error) {
      return errorResponse(res, error.message, 404);
    }

    return successResponse(res, data, 'Shop orders retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getShopPrintOptions = async (req, res, next) => {
  try {
    const { shopId } = req.params;

    const token = req.headers.authorization?.split(' ')[1];

    const data = await supabaseService.getShopOptions(shopId, token);

    return successResponse(res, data, 'Shop print options retrieved');
  } catch (err) {
    next(err);
  }
};


export const createPaperType = async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const { data, error } = await supabaseService.createPaperType(req.body, token);

    if (error) return errorResponse(res, error.message, 400);

    return successResponse(res, data, 'Paper type created', 201);
  } catch (err) {
    next(err);
  }
};

export const createColorMode = async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const { data, error } = await supabaseService.createColorMode(req.body, token);

    if (error) return errorResponse(res, error.message, 400);

    return successResponse(res, data, 'Color mode created', 201);
  } catch (err) {
    next(err);
  }
};

export const createFinishType = async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const { data, error } = await supabaseService.createFinishType(req.body, token);

    if (error) return errorResponse(res, error.message, 400);

    return successResponse(res, data, 'Finish type created', 201);
  } catch (err) {
    next(err);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status: newStatus } = req.body;

    const token = req.headers.authorization.split(' ')[1];

    // 1. Fetch current order
    const { data: order, error } =
      await supabaseService.getOrderById(orderId, token);

    if (error || !order) {
      return errorResponse(res, 'Order not found', 404);
    }

    const currentStatus = order.status;

    // 2. Validate transition
    if (!STATUS_FLOW[currentStatus]?.includes(newStatus)) {
      return errorResponse(
        res,
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
        400
      );
    }

    // 3. Update status
    const { data, error: updateError } =
      await supabaseService.updateOrderStatus(orderId, newStatus, token);

    if (updateError) {
      return errorResponse(res, updateError.message, 400);
    }

    return successResponse(res, data, 'Order status updated successfully');
  } catch (err) {
    next(err);
  }
};


export const getMyShopOrders = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return errorResponse(res, 'Authorization token missing', 401);
    }

    const { data, error } =
      await supabaseService.getOrdersForOwner(token);

    if (error) {
      return errorResponse(res, error.message, 400);
    }

    return successResponse(res, data, 'My shop orders retrieved');
  } catch (err) {
    next(err);
  }
};

export const getMyShop = async (req, res, next) => {
  try {
    const userId = req.user.id; // from auth middleware

    const { data, error } = await supabaseService.getShopByOwner(userId);

    if (error || !data) {
      return errorResponse(res, 'Shop not found for owner', 404);
    }

    return successResponse(res, data, 'Shop retrieved successfully');
  } catch (err) {
    next(err);
  }
};

//Updating shop status to is_active or not 
export const updateMyShopStatus = async (req, res, next) => {
  try {
    const { is_active } = req.body;

    if (typeof is_active !== "boolean") {
      return errorResponse(res, "Invalid is_active value", 400);
    }

    const userId = req.user.id; // from auth middleware

    const { data, error } = await supabaseService.updateShopByOwner(
      userId,
      { is_active }
    );

    if (error) {
      return errorResponse(res, error.message, 400);
    }

    return successResponse(res, data, "Shop status updated");
  } catch (err) {
    next(err);
  }
};
export const updateShopStatusManually = async (req, res, next) => {
  try {
    const { is_active } = req.body;
    const { shopId } = req.params;
    const ownerId = req.user.id;

    if (typeof is_active !== "boolean") {
      return errorResponse(res, "Invalid is_active value", 400);
    }

    // ✅ Verify ownership via service
    const { data: shop, error: shopError } =
      await supabaseService.getShopByIdAndOwner(shopId, ownerId);

    if (shopError || !shop) {
      return errorResponse(res, "Unauthorized", 403);
    }

    // ✅ Update status
    const { data, error } = await supabaseService.updateShopById(
      shopId,
      { is_active }
    );

    if (error) {
      return errorResponse(res, error.message, 400);
    }

    return successResponse(res, data, "Shop status updated");
  } catch (err) {
    next(err);
  }
};

// Updating shop accepting orders status
export const updateMyShopAcceptingOrders = async (req, res, next) => {
  try {
    const { is_accepting_orders } = req.body;

    if (typeof is_accepting_orders !== "boolean") {
      return errorResponse(res, "Invalid is_accepting_orders value", 400);
    }

    const userId = req.user.id; // from auth middleware

    const { data, error } = await supabaseService.updateShopByOwner(
      userId,
      { is_accepting_orders }
    );

    if (error) {
      return errorResponse(res, error.message, 400);
    }

    return successResponse(res, data, "Shop accepting orders status updated");
  } catch (err) {
    next(err);
  }
};

export const activateMyShop = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data, error } =
      await supabaseService.activateShop(userId);

    if (error) {
      return errorResponse(res, error.message, 400);
    }

    return successResponse(
      res,
      data,
      "Shop activated successfully."
    );
  } catch (err) {
    next(err);
  }
};