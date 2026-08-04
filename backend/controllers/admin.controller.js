import { supabaseAdmin } from "../services/supabase.service.js";
import { successResponse, errorResponse } from "../utils/response.js";
import supabaseService from "../services/supabase.service.js";
export const adminGetOrganisations = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("organisations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return errorResponse(res, error.message, 400);
    }

    return successResponse(res, data, "Organisations fetched");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

export const getShopsByOrganisation = async (req, res) => {
  try {
    const { orgId } = req.params;

    const { data, error } = await supabaseAdmin
      .from("shops")
      .select("id, shop_name, block, is_active,status")
      .eq("organisation_id", orgId)
      .order("shop_name");

    if (error) {
      return errorResponse(res, error.message, 400);
    }

    return successResponse(res, data, "Shops fetched");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

export const toggleShopStatus = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { is_active } = req.body;

    const { data, error } = await supabaseAdmin
      .from("shops")
      .update({ is_active })
      .eq("id", shopId)
      .select()
      .single();

    if (error) {
      return errorResponse(res, error.message, 400);
    }

    return successResponse(res, data, "Shop status updated");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

export const getOrganisationAnalytics = async (req, res) => {
  try {
    const { organisationId } = req.params;

    // 1️⃣ Orders count
    const { count: totalOrders, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", organisationId);

    if (orderErr) throw orderErr;

    // 2️⃣ Revenue
    const { data: revenueData, error: revenueErr } = await supabaseAdmin
      .from("payments")
      .select("amount")
      .eq("organisation_id", organisationId)
      .eq("status", "success");

    if (revenueErr) throw revenueErr;

    const totalRevenue = revenueData.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );

    // 3️⃣ Shops
    const { data: shops, error: shopErr } = await supabaseAdmin
      .from("shops")
      .select("is_active")
      .eq("organisation_id", organisationId);

    if (shopErr) throw shopErr;

    const activeShops = shops.filter((s) => s.is_active).length;
    const closedShops = shops.filter((s) => !s.is_active).length;

    // 4️⃣ Orders by date
    const { data: ordersByDate, error: ordersByDateErr } = await supabaseAdmin
      .from("orders")
      .select("created_at")
      .eq("organisation_id", organisationId)
      .eq("is_paid", true);

    if (ordersByDateErr) throw ordersByDateErr;

    const ordersTrend = {};

    ordersByDate.forEach((o) => {
      const date = o.created_at.split("T")[0]; // YYYY-MM-DD
      ordersTrend[date] = (ordersTrend[date] || 0) + 1;
    });

    // 5️⃣ Revenue by date
    const { data: paymentsByDate, error: paymentsByDateErr } =
      await supabaseAdmin
        .from("payments")
        .select("amount, created_at")
        .eq("organisation_id", organisationId)
        .eq("status", "success");

    if (paymentsByDateErr) throw paymentsByDateErr;

    const revenueTrend = {};

    paymentsByDate.forEach((p) => {
      const date = p.created_at.split("T")[0];
      revenueTrend[date] = (revenueTrend[date] || 0) + Number(p.amount);
    });
    const ordersByDateSeries = Object.keys(ordersTrend).map((date) => ({
      date,
      count: ordersTrend[date],
    }));

    const revenueByDateSeries = Object.keys(revenueTrend).map((date) => ({
      date,
      amount: revenueTrend[date],
    }));

    return successResponse(
      res,
      {
        totalOrders,
        totalRevenue,
        activeShops,
        closedShops,
        ordersByDate: ordersByDateSeries,
        revenueByDate: revenueByDateSeries,
      },
      "Organisation analytics fetched",
    );
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

export const getShopAnalytics = async (req, res) => {
  console.log("🔥 HIT getShopAnalytics", req.params.shopId);

  try {
    const { shopId } = req.params;

    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("id, total_price")
      .eq("shop_id", shopId)
      .eq("is_paid", true);

    if (error) {
      return errorResponse(res, error.message, 400);
    }

    const totalOrders = data.length;
    const totalRevenue = data.reduce(
      (sum, order) => sum + Number(order.total_price),
      0,
    );

    return successResponse(res, {
      totalOrders,
      totalRevenue,
    });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

export const getShopOrders = async (req, res) => {
  try {
    const { shopId } = req.params;

    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(
        `
        id,
        order_no,
        total_price,
        status,
        created_at,
        pickup_at,

        users (
          name
        ),

        documents (
          id,
          file_name,
          page_count,
          copies,
          total_price,

          paper_types ( name ),
          color_modes ( name ),
          finish_types ( name )
        )
      `,
      )
      .eq("shop_id", shopId)
      .eq("is_paid", true)
      .order("created_at", { ascending: false });

    if (error) {
      return errorResponse(res, error.message, 400);
    }

    return successResponse(res, data, "Shop orders fetched");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// ===============================
// PAPER TYPES
// ===============================

export const getShopPaperTypes = async (req, res) => {
  try {
    const { shopId } = req.params;

    const { data, error } = await supabaseAdmin
      .from("paper_types")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at");

    if (error) return errorResponse(res, error.message, 400);
    return successResponse(res, data, "Paper types fetched");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

export const addShopPaperType = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { name, base_price } = req.body;

    if (!name || base_price == null) {
      return errorResponse(res, "Name and base price required", 400);
    }

    const { data, error } = await supabaseAdmin
      .from("paper_types")
      .insert({ shop_id: shopId, name, base_price })
      .select()
      .single();

    if (error) return errorResponse(res, error.message, 400);
    return successResponse(res, data, "Paper type added");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

export const toggleShopPaperType = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const { data, error } = await supabaseAdmin
      .from("paper_types")
      .update({ is_active })
      .eq("id", id)
      .select()
      .single();

    if (error) return errorResponse(res, error.message, 400);
    return successResponse(res, data, "Paper type updated");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// ===============================
// COLOR MODES
// ===============================

export const getShopColorModes = async (req, res) => {
  try {
    const { shopId } = req.params;

    const { data, error } = await supabaseAdmin
      .from("color_modes")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at");

    if (error) return errorResponse(res, error.message, 400);
    return successResponse(res, data, "Color modes fetched");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

export const addShopColorMode = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { name, extra_price } = req.body;

    if (!name || extra_price == null) {
      return errorResponse(res, "Name and extra price required", 400);
    }

    const { data, error } = await supabaseAdmin
      .from("color_modes")
      .insert({ shop_id: shopId, name, extra_price })
      .select()
      .single();

    if (error) return errorResponse(res, error.message, 400);
    return successResponse(res, data, "Color mode added");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

export const toggleShopColorMode = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const { data, error } = await supabaseAdmin
      .from("color_modes")
      .update({ is_active })
      .eq("id", id)
      .select()
      .single();

    if (error) return errorResponse(res, error.message, 400);
    return successResponse(res, data, "Color mode updated");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// ===============================
// FINISH TYPES
// ===============================

export const getShopFinishTypes = async (req, res) => {
  try {
    const { shopId } = req.params;

    const { data, error } = await supabaseAdmin
      .from("finish_types")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at");

    if (error) return errorResponse(res, error.message, 400);
    return successResponse(res, data, "Finish types fetched");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

export const addShopFinishType = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { name, extra_price } = req.body;

    if (!name || extra_price == null) {
      return errorResponse(res, "Name and extra price required", 400);
    }

    const { data, error } = await supabaseAdmin
      .from("finish_types")
      .insert({ shop_id: shopId, name, extra_price })
      .select()
      .single();

    if (error) return errorResponse(res, error.message, 400);
    return successResponse(res, data, "Finish type added");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

export const toggleShopFinishType = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const { data, error } = await supabaseAdmin
      .from("finish_types")
      .update({ is_active })
      .eq("id", id)
      .select()
      .single();

    if (error) return errorResponse(res, error.message, 400);
    return successResponse(res, data, "Finish type updated");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

export const createShopDraft = async (req, res) => {
  try {
    const {
      shop_name,
      block,
      organisation_id,
      owner_name,
      owner_email,
      open_time,
      close_time,
    } = req.body;

    // Normalize input
    const normalizedShopName = shop_name?.trim();
    const normalizedBlock = block?.trim();
    const normalizedOwnerName = owner_name?.trim();
    const normalizedOwnerEmail = owner_email?.trim().toLowerCase();

    if (
      !normalizedShopName ||
      !normalizedBlock ||
      !organisation_id ||
      !normalizedOwnerName ||
      !normalizedOwnerEmail
    ) {
      return errorResponse(res, "Missing required fields", 400);
    }

    // Check duplicate owner email
    const { data: existingOwner } = await supabaseAdmin
      .from("shops")
      .select("id")
      .eq("owner_email", normalizedOwnerEmail)
      .maybeSingle();

    if (existingOwner) {
      return errorResponse(
        res,
        "This owner email is already assigned to another shop.",
        409,
      );
    }

    const { data: existingShop } = await supabaseAdmin
      .from("shops")
      .select("id")
      .eq("organisation_id", organisation_id)
      .ilike("shop_name", normalizedShopName)
      .maybeSingle();

    if (existingShop) {
      return errorResponse(
        res,
        "A shop with this name already exists in this organisation.",
        409,
      );
    }

    const { data, error } = await supabaseAdmin
      .from("shops")
      .insert({
        shop_name: normalizedShopName,
        block: normalizedBlock,
        organisation_id,

        owner_name: normalizedOwnerName,
        owner_email: normalizedOwnerEmail,

        owner_id: null,
        status: "draft",

        open_time: open_time || "09:00",
        close_time: close_time || "17:00",
      })
      .select()
      .single();

    if (error) {
      return errorResponse(res, error.message, 400);
    }

    return successResponse(res, data, "Shop draft created successfully", 201);
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

export const inviteVendor = async (req, res, next) => {
  try {
    const { shopId } = req.params;

    const { data, error } =
      await supabaseService.inviteVendor(shopId);

    if (error) {
      return errorResponse(
        res,
        error.message,
        400
      );
    }

    return successResponse(
      res,
      data,
      "Vendor invited successfully."
    );
  } catch (err) {
    next(err);
  }
};