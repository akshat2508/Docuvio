import crypto from 'crypto';
import paymentService from '../services/payment.service.js';
import supabaseService from '../services/supabase.service.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const createPaymentOrder = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { orderId } = req.body;

    const { data: order, error } =
      await supabaseService.getOrderForPayment(orderId);

    if (error || !order) {
      return errorResponse(res, 'Order not found', 404);
    }

    if (order.student_id !== studentId) {
      return errorResponse(res, 'Unauthorized', 403);
    }

    if (order.is_paid) {
      return errorResponse(res, 'Order already paid', 400);
    }

    if (order.total_price <= 0) {
      return errorResponse(res, 'Invalid order amount', 400);
    }

    // 🔹 Get shop
const { data: shop } = await supabaseService.getShopById(order.shop_id);

if (!shop) {
  return errorResponse(res, "Shop not found", 404);
}

if (!shop.razorpay_account_id) {
  return errorResponse(res, "Shop not onboarded for payments", 400);
}

// 🔹 1. Get document prices
const { data: docs, error: docError } =
  await supabaseService.getDocumentTotal(orderId);

if (docError || !docs || docs.length === 0) {
  return errorResponse(res, "No documents found", 400);
}

// 🔹 2. Calculate document total
const documentPrice = docs.reduce(
  (sum, doc) => sum + Number(doc.total_price || 0),
  0
);

// 🔹 3. Handling fee
const handlingFee = Number(order.handling_fee || 0);

// 🔹 4. Platform fee slab
function calculatePlatformFee(amount, orderType) {
  if (orderType === "walk_in") {
    return amount < 100 ? 1 : 2;
  }

  // online orders
  if (amount < 20) return 2;
  if (amount <= 50) return 4;
  if (amount <= 80) return 6;
  if (amount <= 100) return 9;
  if (amount <= 200) return 13;
  return 16;
}

const platformFee = calculatePlatformFee(
  documentPrice,
  order.order_type
);
// 🔹 5. Final payable amount
const finalAmount = order.total_price;

// 🔹 6. Convert to paise
const finalAmountPaise = Math.round(finalAmount * 100);
const shopAmount = Math.round(documentPrice * 100);

// 🔒 Safety
if (shopAmount <= 0 || finalAmountPaise <= 0) {
  return errorResponse(res, "Invalid payment calculation", 400);
}
// 🔹 Create Razorpay order with transfer
const razorpayOrder = await paymentService.createOrderWithTransfer({
  amount: finalAmount,
  receipt: orderId,
  transfers: [
    {
      account: shop.razorpay_account_id,
      amount: shopAmount,
      currency: "INR",
    },
  ],
});
const authHeader = req.headers.authorization;

if (!authHeader) {
  return errorResponse(res, "Authorization header missing", 401);
}

const token = authHeader.split(" ")[1];

if (!token) {
  return errorResponse(res, "Invalid token format", 401);
}

const {
  data: createdPayment,
  error: paymentCreateError,
} =
  await supabaseService.createPayment(
    {
      order_id: orderId,
      student_id: studentId,
      amount: order.total_price,
      platform_fee: platformFee,
      razorpay_order_id: razorpayOrder.id,
      status: "created",
    }
  );

console.log("💳 PAYMENT RECORD CREATION:", {
  razorpayOrderId: razorpayOrder.id,
  orderId,
  createdPayment,
  paymentCreateError,
});

if (paymentCreateError || !createdPayment) {
  console.error(
    "❌ FAILED TO CREATE LOCAL PAYMENT:",
    paymentCreateError
  );

  return errorResponse(
    res,
    "Failed to create payment record",
    500
  );
}


    return successResponse(res, razorpayOrder, 'Payment order created');
  } catch (err) {
    console.error(err);
    return errorResponse(res, 'Payment initialization failed', 500);
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    console.log("🔥 VERIFY PAYMENT HIT", {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    // ============================================================
    // 1️⃣ BASIC VALIDATION
    // ============================================================

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return errorResponse(
        res,
        "Missing payment verification data",
        400
      );
    }

    // ============================================================
    // 2️⃣ FIND LOCAL PAYMENT USING RAZORPAY ORDER ID
    // ============================================================
    // IMPORTANT:
    // Do NOT trust orderId sent by the frontend.
    //
    // We determine the real order from:
    //
    // razorpay_order_id
    //        ↓
    // payments table
    //        ↓
    // order_id
    //
    // This makes the database relationship authoritative.

    const {
      data: existingPayment,
      error: paymentLookupError,
    } = await supabaseService.getPaymentByRazorpayOrder(
      razorpay_order_id
    );

    if (paymentLookupError) {
      console.error(
        "❌ PAYMENT LOOKUP FAILED:",
        paymentLookupError
      );

      return errorResponse(
        res,
        "Unable to find payment",
        500
      );
    }

    if (!existingPayment) {
      console.error(
        "❌ PAYMENT RECORD NOT FOUND:",
        razorpay_order_id
      );

      return errorResponse(
        res,
        "Payment record not found",
        404
      );
    }

    // This is now the ONLY order ID we trust.
    const actualOrderId = existingPayment.order_id;

    console.log("🔎 PAYMENT RECORD FOUND:", {
      paymentId: existingPayment.id,
      orderId: actualOrderId,
      razorpayOrderId:
        existingPayment.razorpay_order_id,
      status: existingPayment.status,
    });

    // ============================================================
    // 3️⃣ IDEMPOTENCY CHECK
    // ============================================================
    //
    // If webhook already processed the payment while the app
    // was still open, simply return success.
    //
    // This is important because both:
    //
    // webhook
    // AND
    // /verify
    //
    // can arrive for the same payment.

    if (existingPayment.status === "success") {
      console.log(
        "ℹ️ PAYMENT ALREADY VERIFIED:",
        razorpay_order_id
      );

      return successResponse(
        res,
        null,
        "Payment already verified"
      );
    }

    // ============================================================
    // 4️⃣ VERIFY RAZORPAY SIGNATURE
    // ============================================================

    const body =
      razorpay_order_id +
      "|" +
      razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_KEY_SECRET
      )
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.error(
        "❌ INVALID RAZORPAY PAYMENT SIGNATURE",
        {
          razorpay_order_id,
          razorpay_payment_id,
        }
      );

      return errorResponse(
        res,
        "Payment verification failed",
        400
      );
    }

    console.log(
      "✅ RAZORPAY PAYMENT SIGNATURE VERIFIED:",
      razorpay_order_id
    );

    // ============================================================
    // 5️⃣ MARK PAYMENT SUCCESS
    // ============================================================

    const {
      data: updatedPayment,
      error: payErr,
    } =
      await supabaseService.markPaymentSuccess(
        actualOrderId,
        razorpay_payment_id,
        razorpay_signature
      );

    if (payErr) {
      console.error(
        "❌ PAYMENT UPDATE FAILED:",
        payErr
      );

      return errorResponse(
        res,
        "Payment DB update failed",
        500
      );
    }

    // If the payment update didn't affect a row,
    // do NOT pretend the payment succeeded.
    if (!updatedPayment) {
      console.error(
        "❌ PAYMENT UPDATE AFFECTED NO ROWS:",
        {
          orderId: actualOrderId,
          razorpayOrderId: razorpay_order_id,
        }
      );

      return errorResponse(
        res,
        "Payment DB update failed",
        500
      );
    }

    console.log(
      "✅ PAYMENT MARKED SUCCESS:",
      {
        orderId: actualOrderId,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId:
          razorpay_payment_id,
      }
    );

    // ============================================================
    // 6️⃣ MARK ORDER PAID
    // ============================================================

    const {
      data: updatedOrder,
      error: orderErr,
    } =
      await supabaseService.markOrderPaid(
        actualOrderId
      );

    if (orderErr) {
      console.error(
        "❌ ORDER UPDATE FAILED:",
        orderErr
      );

      return errorResponse(
        res,
        "Order update failed",
        500
      );
    }

    // Again, make sure the database actually returned
    // the updated order.
    if (!updatedOrder) {
      console.error(
        "❌ ORDER UPDATE AFFECTED NO ROWS:",
        actualOrderId
      );

      return errorResponse(
        res,
        "Order update failed",
        500
      );
    }

    console.log(
      "✅ ORDER MARKED PAID:",
      {
        orderId: actualOrderId,
        isPaid: updatedOrder.is_paid,
        status: updatedOrder.status,
      }
    );

    // ============================================================
    // 7️⃣ FINAL SUCCESS
    // ============================================================

    return successResponse(
      res,
      null,
      "Payment successful"
    );

  } catch (err) {
    console.error(
      "❌ PAYMENT VERIFICATION ERROR:",
      err
    );

    return errorResponse(
      res,
      "Payment verification error",
      500
    );
  }
};