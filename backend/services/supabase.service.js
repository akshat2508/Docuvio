// services/supabase.service.js
import { createClient } from '@supabase/supabase-js';
import { config } from '../config/env.js';
import logger from "../utils/logger.js"
import { getUserIdFromToken } from '../utils/jwt.js';
// Anon client (no user context)
const supabaseAnon = createClient(
  config.supabase.url,
  config.supabase.key
);
const supabaseAdmin = createClient(
  config.supabase.url,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);


// User client (RLS-aware, per request)
const getUserSupabase = (token) => {
  return createClient(
    config.supabase.url,
    config.supabase.key,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );
};

class SupabaseService {
 async getUserFromToken(token) {
  return await supabaseAnon.auth.getUser(token);
}

async signUp(email, password, metadata) {
  return await supabaseAnon.auth.signUp({
    email,
    password,
    options: { 
      emailRedirectTo: process.env.FRONTEND_URL + "/email-verified",
      data: metadata },
  });
}

async signIn(email, password) {
  return await supabaseAnon.auth.signInWithPassword({
    email,
    password,
  });
}

async getCurrentUser(token) {
 return await supabaseAnon.auth.getUser(token);
}
 async signOut() {
  return await supabaseAnon.auth.signOut();
}

async getUserById(userId) {
  return await supabaseAnon
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
}

async getAppUserById(userId) {
  return await supabaseAdmin
    .from("users")
    .select(`
      id,
      name,
      email,
      role,
      organisation_id
    `)
    .eq("id", userId)
    .single();
}

  async updateUser(userId, updates) {
    return await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
  }

  
  async getShopById(shopId) {
    return await supabaseAnon
    .from('shops')
    .select('*')
    .eq('id', shopId)
    .single();
  }
  
  async createShop(shopData) {
    return await supabase
    .from('shops')
    .insert(shopData)
    .select()
    .single();
  }
  
  async updateShop(shopId, updates) {
    return await supabase
    .from('shops')
    .update(updates)
    .eq('id', shopId)
    .select()
    .single();
  }
  
  async getAllShops() {
  return await supabaseAnon
    .from('shops')
    .select('*')
    // .eq('is_active', true);
}


async createOrder(orderData, token) {
  const supabaseUser = getUserSupabase(token);

  const userId = getUserIdFromToken(token);

if (!userId) {
  return { error: { message: "Invalid user" } };
}

  // 2️⃣ Fetch shop (trusted source)
  const { data: shop, error: shopError } = await supabaseAnon
    .from("shops")
    .select("organisation_id, is_active, is_accepting_orders")
    .eq("id", orderData.shop_id)
    .single();

  if (shopError || !shop) {
    return { error: { message: "Invalid shop" } };
  }

  // 3️⃣ Determine order type (default = online)
  const orderType = orderData.order_type || "online";

  // ===============================
  // 🟣 WALK-IN ORDER RULES
  // ===============================
  if (orderType === "walk_in") {

    // shop must be physically open
    if (!shop.is_active) {
      return {
        error: { message: "Shop is currently closed for walk-in orders" },
      };
    }

    // walk-in specific adjustments
    orderData.pickup_at = null;
    orderData.is_handled = false;
  }

  // ===============================
  // 🟢 ONLINE ORDER RULES
  // ===============================
  if (orderType === "online") {

    // shop must accept online orders
    if (!shop.is_accepting_orders) {
      return {
        error: { message: "Shop is not accepting online orders right now" },
      };
    }

    if (!orderData.pickup_at) {
      return {
        error: { message: "Pickup time required for online orders" },
      };
    }
  }

  // 4️⃣ Insert order (secure values)
  return await supabaseUser
    .from("orders")
    .insert({
      ...orderData,
      order_type: orderType,
      student_id: userId,
      organisation_id: shop.organisation_id,
    })
    .select()
    .single();
}


  async getOrderById(orderId ,token) {
      const supabaseUser = getUserSupabase(token);

    return await supabaseUser
      .from('orders')
      .select('*, documents(*)')
      .eq('id', orderId)
      .single();
  }


async getOrdersByStudentId(studentId, token) {
  const supabaseUser = getUserSupabase(token);

  return await supabaseUser
    .from('orders')
    .select(`
      id,
      order_no,
      status,
      orientation,
      is_handled,
      is_expired,
      handling_fee,
      delivery_otp,
      otp_verified,
      pickup_at,

      total_price,
      notes,
      is_paid,
      paid_at,
      created_at,
      updated_at,

      shops (
        shop_name,
        block
      ),

      documents (
        id,
        file_name,
        file_url,
        page_count,
        copies,
        total_price,

        paper_type_id,
        color_mode_id,
        finish_type_id,

        paper_types ( name ),
        color_modes ( name ),
        finish_types ( name )
      )
    `)
    .eq('student_id', studentId)
    .eq('is_paid' , true)
    .order('created_at', { ascending: false });
}


async updateOrderStatus(orderId, status, token) {
  const supabaseUser = getUserSupabase(token);

  return await supabaseUser
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select()
    .single();
}


  async deleteOrder(orderId) {
    return await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);
  }
async createDocument(documentData, token) {
  const supabaseUser = getUserSupabase(token);

  // 1️⃣ Get order to check type
  const { data: order, error: orderError } = await supabaseUser
    .from("orders")
    .select("order_type")
    .eq("id", documentData.order_id)
    .single();

  if (orderError || !order) {
    return { error: { message: "Invalid order" } };
  }

  // ===============================
  // 🟣 WALK-IN ORDER LOGIC
  // ===============================
  if (order.order_type === "walk_in") {
    if (
      !documentData.manual_price ||
      Number(documentData.manual_price) <= 0
    ) {
      return { error: { message: "Valid manual amount required" } };
    }

    // Force null specs
    documentData.paper_type_id = null;
    documentData.color_mode_id = null;
    documentData.finish_type_id = null;
    documentData.copies = 1;

    // 🔹 Final price = manual price
    documentData.total_price = Number(documentData.manual_price);

    // 🔹 Default print side
    documentData.print_side = "single";
  }

  // ===============================
  // 🟢 ONLINE ORDER LOGIC
  // ===============================
  if (order.order_type === "online") {
    if (
      !documentData.paper_type_id ||
      !documentData.color_mode_id ||
      !documentData.finish_type_id
    ) {
      return { error: { message: "Print configuration required" } };
    }

    // Prevent manual price misuse
    documentData.manual_price = null;

    // 🔹 Default print side
documentData.print_side =
  documentData.print_side?.trim().toLowerCase() === "double"
    ? "double"
    : "single";
    // 🔹 Fetch pricing
    const { data: paper } = await supabaseAnon
      .from("paper_types")
      .select("base_price, double_side_price")
      .eq("id", documentData.paper_type_id)
      .single();

    const { data: color } = await supabaseAnon
      .from("color_modes")
      .select("extra_price")
      .eq("id", documentData.color_mode_id)
      .single();

    const { data: finish } = await supabaseAnon
      .from("finish_types")
      .select("extra_price")
      .eq("id", documentData.finish_type_id)
      .single();

    // 🚨 Safety check
    if (!paper || !color || !finish) {
      return { error: { message: "Invalid pricing configuration" } };
    }

    const base = Number(paper.base_price || 0);
    const doublePrice = Number(paper.double_side_price || base); // fallback
    const colorExtra = Number(color.extra_price || 0);
    const finishExtra = Number(finish.extra_price || 0);
console.log("PRICING:", {
  base,
  doublePrice,
  colorExtra,
  finishExtra
});
    const pages = Number(documentData.page_count);
    const copies = Number(documentData.copies);

    // 🚨 Input validation
    if (!pages || pages <= 0 || !copies || copies <= 0) {
      return { error: { message: "Invalid page or copy count" } };
    }

    // 🔹 Sheet calculation
    const sheets =
      documentData.print_side === "double"
        ? Math.ceil(pages / 2)
        : pages;
      
        console.log("DEBUG:", {
  pages,
  printSide: documentData.print_side,
  sheets
});

    // 🔹 Price per sheet
    const pricePerSheet =
      documentData.print_side === "double"
        ? doublePrice
        : base;

    // 🔹 Final price
    const totalPrice =
      sheets * copies * (pricePerSheet + colorExtra + finishExtra);

    documentData.total_price = totalPrice;
  }

  // ===============================
  // 💾 INSERT DOCUMENT
  // ===============================
  return await supabaseUser
    .from("documents")
    .insert(documentData)
    .select()
    .single();
}
  async getDocumentsByOrderId(orderId) {
    return await supabase
      .from('documents')
      .select('*')
      .eq('order_id', orderId);
  }

  async getDocumentForDownload(documentId, token) {
  const supabaseUser = getUserSupabase(token);

  return await supabaseUser
    .from('documents')
    .select(`
      id,
      file_url,
      orders (
        student_id,
        shop_id,
        shops (
          owner_id
        )
      )
    `)
    .eq('id', documentId)
    .single();
}
async getPrintOptionsByShop(shopId, token) {
  const supabaseUser = getUserSupabase(token);

  return await supabaseUser
    .from('print_options')
    .select(
      `
      id,
      paper_type,
      color_mode,
      finish_type,
      price_per_page
      `
    )
    .eq('shop_id', shopId)
    .eq('is_active', true)
    .order('paper_type', { ascending: true });
}

async createPrintOption(printOptionData, token) {
  const supabaseUser = getUserSupabase(token);

  return await supabaseUser
    .from('print_options')
    .insert(printOptionData)
    .select()
    .single();
}

async getShopOptions(shopId, token) {
  const supabaseUser = getUserSupabase(token);

  const paper = await supabaseUser
    .from('paper_types')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at');

  const color = await supabaseUser
    .from('color_modes')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at');

  const finish = await supabaseUser
    .from('finish_types')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at');

  return {
    paper_types: paper.data,
    color_modes: color.data,
    finish_types: finish.data
  };
}


async getShopOptionsStudent(shopId) {
  const [paper, color, finish] = await Promise.all([
    supabaseAnon
      .from('paper_types')
      .select('*')
      .eq('shop_id', shopId)
      .eq('is_active', true),

    supabaseAnon
      .from('color_modes')
      .select('*')
      .eq('shop_id', shopId)
      .eq('is_active', true),

    supabaseAnon
      .from('finish_types')
      .select('*')
      .eq('shop_id', shopId)
      .eq('is_active', true)
  ]);

  return {
    paper_types: paper.data,
    color_modes: color.data,
    finish_types: finish.data
  };
}
async getPrintOptionsByShop(shopId) {
  return await supabaseAnon
    .from('print_options')
    .select('*')
    .eq('shop_id', shopId)
    .eq('is_active', true);
}

async getPaperTypesByShop(shopId) {
  return await supabaseAnon
    .from('paper_types')
    .select('*')
    .eq('shop_id', shopId)
    .eq('is_active', true)
    .order('created_at');
}
async createPaperType(data, token) {
  const supabaseUser = getUserSupabase(token);

  return await supabaseUser
    .from('paper_types')
    .insert(data)
    .select()
    .single();
}

async getColorModesByShop(shopId) {
  return await supabaseAnon
    .from('color_modes')
    .select('*')
    .eq('shop_id', shopId)
    .eq('is_active', true)
    .order('created_at');
}

async createColorMode(colorData, token) {
  const supabaseUser = getUserSupabase(token);

  return await supabaseUser
    .from('color_modes')
    .insert(colorData)
    .select()
    .single();
}


// async getFinishTypesByShop(shopId) {
//   return await supabaseAnon
//     .from('finish_types')
//     .select('*')
//     .eq('shop_id', shopId)
//     .eq('is_active', true);
// }

// async createFinishType(finishData, token) {
//   const supabaseUser = getUserSupabase(token);

//   return await supabaseUser
//     .from('finish_types')
//     .insert(finishData)
//     .select()
//     .single();
// }

async getFinishTypesByShop(shopId) {
  return await supabaseAnon
    .from('finish_types')
    .select('*')
    .eq('shop_id', shopId)
    .eq('is_active', true)
    .order('created_at');
}


async createFinishType(data, token) {
  const supabaseUser = getUserSupabase(token);

  return await supabaseUser
    .from('finish_types')
    .insert(data)
    .select()
    .single();
}
// =========================================================
// SUPERVISOR
// =========================================================

async getShopsBySupervisor(supervisorId, organisationId) {
  return await supabaseAdmin
    .from("shops")
    .select(`
      id,
      shop_name,
      block,
      organisation_id,
      supervisor_id,
      owner_id,
      owner_name,
      owner_email,
      is_active,
      is_accepting_orders,
      status,
      open_time,
      close_time,
      created_at,
      updated_at
    `)
    .eq("supervisor_id", supervisorId)
    .eq("organisation_id", organisationId)
    .order("shop_name", { ascending: true });
}


async getSupervisorShop(shopId, supervisorId, organisationId) {
  return await supabaseAdmin
    .from("shops")
    .select(`
      id,
      shop_name,
      block,
      organisation_id,
      supervisor_id,
      owner_id,
      owner_name,
      owner_email,
      is_active,
      is_accepting_orders,
      status,
      open_time,
      close_time,
      created_at,
      updated_at
    `)
    .eq("id", shopId)
    .eq("supervisor_id", supervisorId)
    .eq("organisation_id", organisationId)
    .maybeSingle();
}


async getSupervisorShopOrders(shopId) {
  return await supabaseAdmin
    .from("orders")
    .select(`
      id,
      order_no,
      total_price,
      status,
      created_at,
      pickup_at,
      is_paid,
      is_handled,
      is_expired,
      handling_fee,
      order_type,

      users (
        name
      ),

      documents (
        id,
        file_name,
        page_count,
        copies,
        total_price,
        print_side,

        paper_types ( name ),
        color_modes ( name ),
        finish_types ( name )
      )
    `)
    .eq("shop_id", shopId)
    .eq("is_paid", true)
    .order("created_at", { ascending: false });
}


async getSupervisorShopAnalytics(shopId) {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("id, total_price, created_at")
    .eq("shop_id", shopId)
    .eq("is_paid", true);

  if (error) {
    return { data: null, error };
  }

  const totalOrders = data.length;

  const totalRevenue = data.reduce(
    (sum, order) => sum + Number(order.total_price || 0),
    0
  );

  const ordersTrend = {};
  const revenueTrend = {};

  data.forEach((order) => {
    const date = order.created_at.split("T")[0];

    ordersTrend[date] =
      (ordersTrend[date] || 0) + 1;

    revenueTrend[date] =
      (revenueTrend[date] || 0) +
      Number(order.total_price || 0);
  });

  const ordersByDate = Object.keys(ordersTrend).map((date) => ({
    date,
    count: ordersTrend[date],
  }));

  const revenueByDate = Object.keys(revenueTrend).map((date) => ({
    date,
    amount: revenueTrend[date],
  }));

  return {
    data: {
      totalOrders,
      totalRevenue,
      ordersByDate,
      revenueByDate,
    },
    error: null,
  };
}


async updateSupervisorShopStatus(shopId, supervisorId, organisationId, is_active) {
  return await supabaseAdmin
    .from("shops")
    .update({
      is_active,
    })
    .eq("id", shopId)
    .eq("supervisor_id", supervisorId)
    .eq("organisation_id", organisationId)
    .select()
    .single();
}


async updateSupervisorShopAcceptingOrders(
  shopId,
  supervisorId,
  organisationId,
  is_accepting_orders
) {
  return await supabaseAdmin
    .from("shops")
    .update({
      is_accepting_orders,
    })
    .eq("id", shopId)
    .eq("supervisor_id", supervisorId)
    .eq("organisation_id", organisationId)
    .select()
    .single();
}

async getSupervisorDashboardOrders(shopIds) {
  return await supabaseAdmin
    .from("orders")
    .select(`
      id,
      shop_id,
      status,
      total_price,
      created_at
    `)
    .in("shop_id", shopIds)
    .eq("is_paid", true)
    .order("created_at", { ascending: false });
}

//Functions for payments
async createPayment(data, token) {


  return await supabaseAdmin
    .from('payments')
    .insert(data)
    .select()
    .single();
}


async markPaymentSuccess(
  orderId,
  paymentId,
  signature
) {
  return await supabaseAdmin
    .from("payments")
    .update({
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
      status: "success",
      updated_at: new Date().toISOString(),
    })
    .eq("order_id", orderId)
    .select(`
      id,
      order_id,
      status,
      razorpay_payment_id
    `)
    .maybeSingle();
}



// supabase.service.js
async getOrderForPayment(orderId) {
  return await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();
}
async markOrderPaid(orderId) {
  return await supabaseAdmin
    .from("orders")
    .update({
      is_paid: true,
      status: "confirmed",
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    // .eq("is_paid", false)
    .select(`
      id,
      is_paid,
      status,
      paid_at
    `)
    .maybeSingle();
}
//webhook helper functions

async markPaymentWebhookSuccess(
  razorpayOrderId,
  razorpayPaymentId
) {
  return await supabaseAdmin
    .from("payments")
    .update({
      status: "success",
      razorpay_payment_id: razorpayPaymentId,
      updated_at: new Date().toISOString(),
    })
    .eq("razorpay_order_id", razorpayOrderId)
    .select(`
      id,
      order_id,
      razorpay_order_id,
      razorpay_payment_id,
      status,
      amount
    `)
    .maybeSingle();
}

async markOrderPaidByRazorpayOrder(razorpayOrderId) {
  const {
    data: payment,
    error: paymentLookupError,
  } = await supabaseAdmin
    .from("payments")
    .select("order_id")
    .eq("razorpay_order_id", razorpayOrderId)
    .maybeSingle();

  if (paymentLookupError) {
    return {
      data: null,
      error: paymentLookupError,
    };
  }

  if (!payment) {
    return {
      data: null,
      error: {
        message: "Payment record not found",
        code: "PAYMENT_NOT_FOUND",
      },
    };
  }

  return await supabaseAdmin
    .from("orders")
    .update({
      is_paid: true,
      status: "confirmed",
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.order_id)
    .select(`
      id,
      is_paid,
      status,
      paid_at
    `)
    .single();
}


async getOrdersForOwner(token) {
  // 1️⃣ Get user from token
 const userId = getUserIdFromToken(token);

if (!userId) {
  return { error: new Error("Invalid token") };
}

  // 2️⃣ Get shop owned by user
  const { data: shop, error: shopError } = await supabaseAnon
    .from('shops')
    .select('id, shop_name, is_active')
    .eq('owner_id', userId)
    .single();

  if (shopError || !shop) {
    return { error: shopError || new Error('Shop not found for owner') };
  }
  const start = Date.now(); // ⏱ start timer

  // 3️⃣ Fetch orders
  const result = await supabaseAdmin
  .from('orders')
  .select(`
    id,
    order_no,
    status,
    orientation,
    is_handled,
    handling_fee,
    is_paid,
    is_expired,
    notes,
    created_at,
    pickup_at,
    student_id,
    total_price,
    order_type,

    student:users!fk_order_student (
      name
    ),

    documents (
      id,
      file_name,
      file_url,
      page_count,
      copies,
      total_price,
      print_side,

      paper_types ( name ),
      color_modes ( name ),
      finish_types ( name )
    )
  `)
  .eq('shop_id', shop.id)
  .eq('is_paid',true)
  .order('created_at', { ascending: false })
  .limit(50);
  const duration = Date.now() - start; // ⏱ end timer

logger.info("SHOP_ORDERS_QUERY_TIME", {
  shopId: shop.id,
  duration: `${duration}ms`
});

  return result;
}

async getPaymentByRazorpayOrder(razorpayOrderId) {
  return await supabaseAdmin
    .from("payments")
    .select(`
      id,
      order_id,
      student_id,
      amount,
      razorpay_order_id,
      razorpay_payment_id,
      status
    `)
    .eq("razorpay_order_id", razorpayOrderId)
    .maybeSingle();
}


async getShopByOwner(ownerId) {
  return await supabaseAnon
    .from('shops')
    .select('id , shop_name , is_active,is_accepting_orders, close_time ,open_time')
    .eq('owner_id', ownerId)
    .single();
}

// paper type
async updatePaperType(id, is_active, token) {
  const supabaseUser = getUserSupabase(token);

  return await supabaseUser
    .from('paper_types')
    .update({ is_active })
    .eq('id', id)
    .select()
    .single();
}

// color mode
async updateColorMode(id, is_active, token) {
  const supabaseUser = getUserSupabase(token);

  return await supabaseUser
    .from('color_modes')
    .update({ is_active })
    .eq('id', id)
    .select()
    .single();
}

// finish type
async updateFinishType(id, is_active, token) {
  const supabaseUser = getUserSupabase(token);

  return await supabaseUser
    .from('finish_types')
    .update({ is_active })
    .eq('id', id)
    .select()
    .single();
}

//NEW OTP SERVICE
async getOrderOtpData(orderId) {
  return await supabaseAdmin
    .from("orders")
    .select("delivery_otp, otp_verified")
    .eq("id", orderId)
    .single();
}

async markOrderDelivered(orderId) {
  return await supabaseAdmin
    .from("orders")
    .update({
      otp_verified: true,
      otp_verified_at: new Date(),
      status: "completed",
    })
    .eq("id", orderId)
    .select()
    .single();
}

//Updating status of shop to isactive or not 
async updateShopByOwner(ownerId, updates) {
  return await supabaseAdmin
    .from("shops")
    .update(updates)
    .eq("owner_id", ownerId)
    .select()
    .single();
}

async updateShopById(shopId, updates) {
  return await supabaseAdmin
    .from("shops")
    .update(updates)
    .eq("id", shopId)
    .select()
    .single();
}

async inviteVendor(shopId) {

  // 1️⃣ Fetch shop
  const { data: shop, error: shopError } = await supabaseAdmin
    .from("shops")
    .select(`
      id,
      shop_name,
      owner_name,
      owner_email,
      organisation_id,
      status,
      invite_attempts
    `)
    .eq("id", shopId)
    .single();

  if (shopError || !shop) {
    return {
      error: {
        message: "Shop not found",
      },
    };
  }

  // 2️⃣ Already activated?
  if (shop.status === "active") {
    return {
      error: {
        message: "Vendor already activated.",
      },
    };
  }

  // 3️⃣ Email missing?
  if (!shop.owner_email) {
    return {
      error: {
        message: "Owner email is missing.",
      },
    };
  }

  // 4️⃣ Send invite
  const { data, error } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(
      shop.owner_email,
      {
        redirectTo:
          `${process.env.FRONTEND_URL}/accept-invite`,

        data: {
          role: "shop_owner",
          organisation_id: shop.organisation_id,
          shop_id: shop.id,
          shop_name: shop.shop_name,
        },
      }
    );

  if (error) {
    return { error };
  }

  // 5️⃣ Update shop
  const { error: updateError } = await supabaseAdmin
    .from("shops")
    .update({
      status: "invite_sent",
      invite_sent_at: new Date().toISOString(),
      invite_attempts:
        (shop.invite_attempts || 0) + 1,
    })
    .eq("id", shop.id);

  if (updateError) {
    return { error: updateError };
  }

  return {
    data,
  };
}

async activateShop(userId) {

  // 1. Get authenticated user
  const { data: userData, error: authError } =
    await supabaseAdmin.auth.admin.getUserById(userId);

  if (authError || !userData.user) {
    return {
      error: {
        message: "User not found",
      },
    };
  }

  const authUser = userData.user;

  const email = authUser.email;

  // 2. Find the draft shop
  const { data: shop, error: shopError } =
    await supabaseAdmin
      .from("shops")
      .select("id, owner_id, status")
      .eq("owner_email", email)
      .single();

  if (shopError || !shop) {
    return {
      error: {
        message: "Draft shop not found",
      },
    };
  }

  // 3. Already activated?
 if (shop.owner_id) {
  return {
    error: {
      message: "Shop has already been activated.",
      code: "SHOP_ALREADY_ACTIVATED",
    },
  };
}

  // 4. Activate shop
  const { data, error } =
    await supabaseAdmin
      .from("shops")
      .update({
        owner_id: userId,
        status: "active",
        activated_at: new Date().toISOString(),
      })
      .eq("id", shop.id)
      .select()
      .single();

  if (error) {
    return { error };
  }

  return { data };
}

//to fetch student email , name and shop anme (email context helper)
async getOrderEmailContext(orderId) {
  return await supabaseAdmin
    .from("orders")
    .select(`
      order_no,
      student:users!fk_order_student (
        id,
        email,
        name
      ),
      shop:shops!fk_order_shop (
        shop_name
      )
    `)
    .eq("id", orderId)
    .single();
}
// 🔐 Send password reset email (FORGOT PASSWORD)
async sendPasswordResetEmail(email) {
  if (!email) {
    return {
      error: { message: "Email is required" },
    };
  }

  return await supabaseAnon.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL1}/update-password`,
  });
}

async getShopByIdAndOwner(shopId, ownerId) {
  return await supabaseAdmin
    .from("shops")
    .select("id")
    .eq("id", shopId)
    .eq("owner_id", ownerId)
    .single();
}

async updateShopById(shopId, updates) {
  return await supabaseAdmin
    .from("shops")
    .update(updates)
    .eq("id", shopId)
    .select()
    .single();
}
// Register device token
async registerDeviceToken(userId, token, platform = "android") {
  return await supabaseAdmin
    .from("user_device_tokens")
    .upsert(
      {
        user_id: userId,
        fcm_token: token,
        platform,
      },
      { onConflict: "user_id,fcm_token" }
    );
}

// Get tokens by user
async getUserDeviceTokens(userId) {
  return await supabaseAdmin
    .from("user_device_tokens")
    .select("fcm_token")
    .eq("user_id", userId);
}

// Remove device token
async unregisterDeviceToken(userId, token) {
  return await supabaseAdmin
    .from("user_device_tokens")
    .delete()
    .eq("user_id", userId)
    .eq("fcm_token", token);
}
async getDocumentTotal(orderId) {
  return await supabaseAnon
    .from("documents")
    .select("total_price")
    .eq("order_id", orderId);
}

}
export { supabaseAdmin , supabaseAnon};
export default new SupabaseService();