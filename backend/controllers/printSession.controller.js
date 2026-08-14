import printSessionService from "../services/printSession.service.js";
import {
  isValidPrintSessionTransition,
} from "../utils/printSessionStatus.js";
import { successResponse, errorResponse } from "../utils/response.js";
import supabaseService from "../services/supabase.service.js";
import storageService
  from "../services/storage.service.js";
import crypto from "crypto";
import paymentService from "../services/payment.service.js";

/**
 * ---------------------------------------------------------
 * PUBLIC QR → START SESSION
 * ---------------------------------------------------------
 *
 * Customer scans:
 *
 * /print-session/shop/:publicCode
 *
 * The public code identifies the shop.
 * A temporary session token is then generated.
 */
export const startPrintSession = async (req, res, next) => {
  try {
    const { publicCode } = req.params;

    if (!publicCode) {
      return errorResponse(res, "Shop code is required", 400);
    }

    const { data: shop, error: shopError } =
      await printSessionService.getShopByPublicCode(publicCode);

    if (shopError || !shop) {
      return errorResponse(res, "Shop not found", 404);
    }

    if (!shop.is_active) {
      return errorResponse(
        res,
        "This shop is currently closed",
        403
      );
    }

    const { data: session, error: sessionError } =
      await printSessionService.createSession({
        shopId: shop.id,
        organisationId: shop.organisation_id,
      });

    if (sessionError || !session) {
      return errorResponse(
        res,
        sessionError?.message || "Unable to start print session",
        500
      );
    }

    return successResponse(
      res,
      {
        sessionToken: session.session_token,
        sessionId: session.id,
        shop: {
          id: shop.id,
          shopName: shop.shop_name,
          block: shop.block,
        },
        status: session.status,
        expiresAt: session.expires_at,
      },
      "Print session started",
      201
    );
  } catch (error) {
    next(error);
  }
};


/**
 * ---------------------------------------------------------
 * CUSTOMER — GET SESSION
 * ---------------------------------------------------------
 */
export const getCustomerSession = async (req, res, next) => {
  try {
    const { sessionToken } = req.params;

    if (!sessionToken) {
      return errorResponse(res, "Session token is required", 400);
    }

    const { data, error } =
      await printSessionService.getSessionByToken(sessionToken);

    if (error || !data) {
      return errorResponse(res, "Print session not found", 404);
    }

    return successResponse(
      res,
      data,
      "Print session retrieved"
    );
  } catch (error) {
    next(error);
  }
};


/**
 * ---------------------------------------------------------
 * CUSTOMER — SUBMIT DETAILS
 * ---------------------------------------------------------
 */
export const submitCustomerDetails = async (req, res, next) => {
  try {
    const { sessionToken } = req.params;
    const {
      customerName,
      customerPhone,
    } = req.body;

    if (!customerName?.trim()) {
      return errorResponse(
        res,
        "Customer name is required",
        400
      );
    }

    if (!customerPhone?.trim()) {
      return errorResponse(
        res,
        "Customer phone is required",
        400
      );
    }

    const { data: session, error: sessionError } =
      await printSessionService.getSessionByToken(sessionToken);

    if (sessionError || !session) {
      return errorResponse(
        res,
        "Print session not found",
        404
      );
    }

    if (
      !isValidPrintSessionTransition(
        session.status,
        "customer_details"
      )
    ) {
      return errorResponse(
        res,
        `Cannot submit customer details from status ${session.status}`,
        400
      );
    }

    const { data, error } =
      await printSessionService.submitCustomerDetails(
        session.id,
        {
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
        }
      );

    if (error) {
      return errorResponse(res, error.message, 400);
    }

    return successResponse(
      res,
      data,
      "Customer details saved"
    );
  } catch (error) {
    next(error);
  }
};


/**
 * ---------------------------------------------------------
 * CUSTOMER — HEARTBEAT
 * ---------------------------------------------------------
 */
export const customerHeartbeat = async (req, res, next) => {
  try {
    const { sessionToken } = req.params;

    const { data: session, error: sessionError } =
      await printSessionService.getSessionByToken(sessionToken);

    if (sessionError || !session) {
      return errorResponse(
        res,
        "Print session not found",
        404
      );
    }

    const { data, error } =
      await printSessionService.updateCustomerHeartbeat(
        session.id
      );

    if (error) {
      return errorResponse(res, error.message, 400);
    }

    return successResponse(
      res,
      data,
      "Customer heartbeat updated"
    );
  } catch (error) {
    next(error);
  }
};


/**
 * ---------------------------------------------------------
 * VENDOR — LIVE SESSIONS
 * ---------------------------------------------------------
 */
export const getLiveSessions = async (req, res, next) => {
  try {
    const ownerId = req.user.id;

    const { data, error } =
      await printSessionService.getLiveSessionsForOwner(
        ownerId
      );

    if (error) {
      return errorResponse(res, error.message, 400);
    }

    return successResponse(
      res,
      data || [],
      "Live sessions retrieved"
    );
  } catch (error) {
    next(error);
  }
};


/**
 * ---------------------------------------------------------
 * VENDOR — GET SINGLE SESSION
 * ---------------------------------------------------------
 */
export const getVendorSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const ownerId = req.user.id;

    const { data, error } =
      await printSessionService.getSessionForOwner(
        sessionId,
        ownerId
      );

    if (error || !data) {
      return errorResponse(
        res,
        "Session not found or access denied",
        404
      );
    }

    return successResponse(
      res,
      data,
      "Session retrieved"
    );
  } catch (error) {
    next(error);
  }
};


/**
 * ---------------------------------------------------------
 * VENDOR — HEARTBEAT
 * ---------------------------------------------------------
 */
export const vendorHeartbeat = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const ownerId = req.user.id;

    const { data: session, error: sessionError } =
      await printSessionService.getSessionForOwner(
        sessionId,
        ownerId
      );

    if (sessionError || !session) {
      return errorResponse(
        res,
        "Session not found or access denied",
        404
      );
    }

    const { data, error } =
      await printSessionService.updateVendorHeartbeat(
        session.id
      );

    if (error) {
      return errorResponse(res, error.message, 400);
    }

    return successResponse(
      res,
      data,
      "Vendor heartbeat updated"
    );
  } catch (error) {
    next(error);
  }
};


/**
 * ---------------------------------------------------------
 * VENDOR — UPDATE SESSION STATUS
 * ---------------------------------------------------------
 */
export const updatePrintSessionStatus = async (
  req,
  res,
  next
) => {
  try {
    const { sessionId } = req.params;
    const { status: nextStatus } = req.body;
    const ownerId = req.user.id;

    if (!nextStatus) {
      return errorResponse(
        res,
        "Status is required",
        400
      );
    }

    const { data: session, error: sessionError } =
      await printSessionService.getSessionForOwner(
        sessionId,
        ownerId
      );

    if (sessionError || !session) {
      return errorResponse(
        res,
        "Session not found or access denied",
        404
      );
    }

    if (
      !isValidPrintSessionTransition(
        session.status,
        nextStatus
      )
    ) {
      return errorResponse(
        res,
        `Invalid session transition from ${session.status} to ${nextStatus}`,
        400
      );
    }

    const { data, error } =
      await printSessionService.updateSessionStatus(
        sessionId,
        ownerId,
        nextStatus
      );

    if (error) {
      return errorResponse(
        res,
        error.message,
        error.status || 400
      );
    }

    return successResponse(
      res,
      data,
      "Session status updated"
    );
  } catch (error) {
    next(error);
  }
};


/**
 * ---------------------------------------------------------
 * VENDOR — SET FINAL QUOTE
 * ---------------------------------------------------------
 */
export const setPrintSessionQuote = async (
  req,
  res,
  next
) => {
  try {
    const { sessionId } = req.params;
    const { amount } = req.body;
    const ownerId = req.user.id;

    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      return errorResponse(
        res,
        "A valid final amount is required",
        400
      );
    }

    const { data: session, error: sessionError } =
      await printSessionService.getSessionForOwner(
        sessionId,
        ownerId
      );

    if (sessionError || !session) {
      return errorResponse(
        res,
        "Session not found or access denied",
        404
      );
    }

    if (
      !isValidPrintSessionTransition(
        session.status,
        "quote_ready"
      )
    ) {
      return errorResponse(
        res,
        `Cannot create quote from status ${session.status}`,
        400
      );
    }

    const { data, error } =
      await printSessionService.setQuote(
        sessionId,
        ownerId,
        numericAmount
      );

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
      "Final amount quoted successfully"
    );
  } catch (error) {
    next(error);
  }
};


/**
 * ---------------------------------------------------------
 * SESSION DOCUMENTS
 * ---------------------------------------------------------
 */
export const getSessionDocuments = async (
  req,
  res,
  next
) => {
  try {
    const { sessionId } = req.params;

    const { data: session, error: sessionError } =
      await printSessionService.getSessionByToken(
        req.sessionToken
      );

    if (sessionError || !session) {
      return errorResponse(
        res,
        "Print session not found",
        404
      );
    }

    const { data, error } =
      await printSessionService.getSessionDocuments(
        session.id
      );

    if (error) {
      return errorResponse(
        res,
        error.message,
        400
      );
    }

    return successResponse(
      res,
      data || [],
      "Session documents retrieved"
    );
  } catch (error) {
    next(error);
  }
};

export const connectPrintSession = async (req, res, next) => {
  try {
    const { sessionToken } = req.params;

    const { data: session, error: sessionError } =
      await printSessionService.getSessionByToken(sessionToken);

    if (sessionError || !session) {
      return errorResponse(
        res,
        "Print session not found",
        404
      );
    }

    if (session.status !== "created") {
      return errorResponse(
        res,
        `Session cannot be connected from status ${session.status}`,
        400
      );
    }

    const { data, error } =
      await printSessionService.connectSession(session.id);

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
      "Print session connected"
    );
  } catch (error) {
    next(error);
  }
};

export const startFileUpload = async (
  req,
  res,
  next
) => {
  try {
    const { sessionToken } = req.params;

    const {
      data,
      error,
    } =
      await printSessionService.startFileUpload(
        sessionToken
      );

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
      "File upload started"
    );
  } catch (err) {
    next(err);
  }
};

export const uploadSessionFile = async (
  req,
  res,
  next
) => {
  try {
    const { sessionToken } = req.params;

    // ------------------------------------------
    // 1. Validate uploaded file
    // ------------------------------------------

    if (!req.file) {
      return errorResponse(
        res,
        "No file uploaded",
        400
      );
    }

    // ------------------------------------------
    // 2. Find session
    // ------------------------------------------

    const {
      data: session,
      error: sessionError,
    } =
      await printSessionService.getSessionByToken(
        sessionToken
      );

    if (sessionError || !session) {
      return errorResponse(
        res,
        "Print session not found",
        404
      );
    }

    // ------------------------------------------
    // 3. Validate session state
    // ------------------------------------------

    if (
      session.status !== "files_uploading" &&
      session.status !== "files_uploaded"
    ) {
      return errorResponse(
        res,
        `Cannot upload files from status ${session.status}`,
        400
      );
    }

    // ------------------------------------------
    // 4. Upload file to B2
    // ------------------------------------------

    const fileKey =
      await storageService.uploadPrintSessionFile(
        req.file,
        sessionToken
      );

    // ------------------------------------------
    // 5. Save file metadata
    // ------------------------------------------

    const {
      data: file,
      error: fileError,
    } =
      await printSessionService.addSessionFile({
        session_id: session.id,
        file_key: fileKey,
        file_name: req.file.originalname,
        mime_type: req.file.mimetype,
        file_size: req.file.size,
      });

    if (fileError) {
      return errorResponse(
        res,
        fileError.message,
        400
      );
    }

    // ------------------------------------------
    // 6. Move to files_uploaded
    // ------------------------------------------

    if (session.status === "files_uploading") {
      const {
        error: statusError,
      } =
        await printSessionService.markFilesUploaded(
          session.id
        );

      if (statusError) {
        return errorResponse(
          res,
          statusError.message,
          400
        );
      }
    }

    // ------------------------------------------
    // 7. Return uploaded file
    // ------------------------------------------

    return successResponse(
      res,
      file,
      "File uploaded successfully",
      201
    );

  } catch (err) {
    next(err);
  }
};

export const getSessionFiles = async (
  req,
  res,
  next
) => {
  try {
    const { sessionToken } = req.params;

    // Find session
    const {
      data: session,
      error: sessionError,
    } =
      await printSessionService.getSessionByToken(
        sessionToken
      );

    if (sessionError || !session) {
      return errorResponse(
        res,
        "Print session not found",
        404
      );
    }

    // Get files
    const {
      data,
      error,
    } =
      await printSessionService.getSessionFiles(
        session.id
      );

    if (error) {
      return errorResponse(
        res,
        error.message,
        400
      );
    }

    return successResponse(
      res,
      data || [],
      "Session files retrieved"
    );

  } catch (err) {
    next(err);
  }
};


export const getSessionFileUrl = async (
  req,
  res,
  next
) => {
  try {
    const { fileId } = req.params;

    // ------------------------------------------
    // 1. Find file
    // ------------------------------------------

    const {
      data: file,
      error,
    } =
      await printSessionService.getSessionFile(
        fileId
      );

    if (error || !file) {
      return errorResponse(
        res,
        "File not found",
        404
      );
    }

    // ------------------------------------------
    // 2. Generate temporary B2 URL
    // ------------------------------------------

    const url =
      await storageService.getSignedUrl(
        file.file_key
      );

    return successResponse(
      res,
      {
        url,
      },
      "Signed URL generated"
    );

  } catch (err) {
    next(err);
  }
};

export const getShopPrintSessions = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const {
      data: shop,
      error: shopError,
    } = await supabaseService.getShopByOwner(userId);

    if (shopError || !shop) {
      return errorResponse(
        res,
        "Shop not found for owner",
        404
      );
    }

    const {
      data,
      error,
    } = await printSessionService.getActiveSessionsForShop(
      shop.id
    );

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
      "Print sessions fetched successfully"
    );
  } catch (error) {
    next(error);
  }
};

// const { data: shop, error: shopError } =
//   await supabaseService.getShopByOwner(req.user.id);

// if (shopError || !shop) {
//   return errorResponse(res, "Shop not found", 404);
// }

// const shopId = shop.id;


export const startSessionReview = async (req, res, next) => {
  try {
    const { sessionToken } = req.params;

    const { data: shop, error: shopError } =
      await supabaseService.getShopByOwner(req.user.id);

    if (shopError || !shop) {
      return errorResponse(res, "Shop not found", 404);
    }

    const { data: session, error: sessionError } =
      await printSessionService.getSessionForShop(
        sessionToken,
        shop.id
      );

    if (sessionError || !session) {
      return errorResponse(
        res,
        "Print session not found",
        404
      );
    }

    if (
      !isValidPrintSessionTransition(
        session.status,
        "reviewing"
      )
    ) {
      return errorResponse(
        res,
        `Cannot start review from status ${session.status}`,
        400
      );
    }

    const { data, error } =
      await printSessionService.markSessionReviewing(
        sessionToken,
        shop.id
      );

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
      "Session opened for review"
    );
  } catch (error) {
    next(error);
  }
};


export const submitSessionQuote = async (req, res, next) => {
  try {
    const { sessionToken } = req.params;
    const { quoted_amount } = req.body;

    const amount = Number(quoted_amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return errorResponse(
        res,
        "Valid quotation amount is required",
        400
      );
    }

    const { data: shop, error: shopError } =
      await supabaseService.getShopByOwner(req.user.id);

    if (shopError || !shop) {
      return errorResponse(
        res,
        "Shop not found",
        404
      );
    }

    const { data: session, error: sessionError } =
      await printSessionService.getSessionForShop(
        sessionToken,
        shop.id
      );

    if (sessionError || !session) {
      return errorResponse(
        res,
        "Print session not found",
        404
      );
    }

    if (
      !isValidPrintSessionTransition(
        session.status,
        "quote_ready"
      )
    ) {
      return errorResponse(
        res,
        `Cannot submit quotation from status ${session.status}`,
        400
      );
    }

    const { data, error } =
      await printSessionService.createSessionQuote(
        sessionToken,
        shop.id,
        amount
      );

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
      "Quotation sent successfully"
    );
  } catch (error) {
    next(error);
  }
};

export const getSessionQuote = async (req, res, next) => {
  try {
    const { sessionToken } = req.params;

    const { data, error } =
      await printSessionService.getSessionByToken(
        sessionToken
      );

    if (error || !data) {
      return errorResponse(
        res,
        "Print session not found",
        404
      );
    }

    return successResponse(
      res,
      {
        session_token: data.session_token,
        status: data.status,
        quoted_amount: data.quoted_amount,
        quoted_at: data.quoted_at,
      },
      "Session quotation fetched"
    );
  } catch (error) {
    next(error);
  }
};

export const createSessionPaymentOrder = async (req, res, next) => {
  try {
    const { sessionToken } = req.params;

    if (!sessionToken) {
      return errorResponse(res, "Session token is required", 400);
    }

    // 1. Fetch session
    const { data: session, error: sessionError } =
      await printSessionService.getSessionForPayment(sessionToken);

    if (sessionError || !session) {
      return errorResponse(res, "Print session not found", 404);
    }

    // 2. FIRST check for an existing payment
    const { data: existingPayment } =
      await printSessionService.getSessionPaymentBySession(session.id);

    if (
      existingPayment &&
      ["payment_pending", "captured"].includes(existingPayment.status)
    ) {
      return successResponse(
        res,
        {
          payment: existingPayment,
        },
        "Existing session payment found"
      );
    }

    // 3. Only a quote_ready session can create a NEW payment
    if (session.status !== "quote_ready") {
      return errorResponse(
        res,
        `Cannot create payment from status ${session.status}`,
        400
      );
    }

    // 4. Validate quotation
    const quotedAmount = Number(session.quoted_amount);

    if (!quotedAmount || quotedAmount <= 0) {
      return errorResponse(res, "Invalid session quotation", 400);
    }

    // 5. Create Razorpay order
    const razorpayAccountId = session.shops?.razorpay_account_id;

if (!razorpayAccountId) {
  return errorResponse(
    res,
    "Shop is not connected to Razorpay",
    400
  );
}

const razorpayOrder = await paymentService.createOrderWithTransfer({
  amount: quotedAmount,
  receipt: `session_${session.session_token}`,
  transfers: [
    {
      account: razorpayAccountId,
      amount: quotedAmount * 100,
      currency: "INR",
    },
  ],
});
    // 6. Save payment
    const { data: payment, error: paymentError } =
      await printSessionService.createSessionPayment({
        session_id: session.id,
        session_token: session.session_token,
        shop_id: session.shop_id,
        organisation_id: session.organisation_id,
        amount: quotedAmount,
        razorpay_order_id: razorpayOrder.id,
        status: "payment_pending",
      });

    if (paymentError) {
      console.error("Session payment DB error:", paymentError);

      return errorResponse(
        res,
        "Failed to create session payment",
        500
      );
    }

    // 7. Move session to payment_pending
    const { error: statusError } =
      await printSessionService.markSessionPaymentPending(
        session.session_token
      );

    if (statusError) {
      console.error(
        "Session status update failed:",
        statusError
      );

      return errorResponse(
        res,
        "Failed to update session payment status",
        500
      );
    }

    return successResponse(
  res,
  {
    payment: {
      id: payment.id,
      session_token: session.session_token,
      amount: quotedAmount,
      razorpay_order_id: razorpayOrder.id,
      currency: "INR",
    },
  },
  "Session payment order created"
);
  } catch (error) {
    next(error);
  }
};
export const verifySessionPayment = async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return errorResponse(
        res,
        "Incomplete payment response",
        400
      );
    }

    // 1. Get payment from OUR database
    const { data: payment, error: paymentError } =
      await printSessionService.getSessionPaymentByRazorpayOrder(
        razorpay_order_id
      );

    if (paymentError || !payment) {
      return errorResponse(
        res,
        "Session payment not found",
        404
      );
    }

    // 2. Idempotency
    if (payment.status === "success") {
      return successResponse(
        res,
        {
          sessionToken: payment.session_token,
          status: "paid",
        },
        "Payment already verified"
      );
    }

    // 3. Verify signature
    const body =
      payment.razorpay_order_id +
      "|" +
      razorpay_payment_id;

    const expectedSignature =
      crypto
        .createHmac(
          "sha256",
          process.env.RAZORPAY_KEY_SECRET
        )
        .update(body)
        .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return errorResponse(
        res,
        "Payment verification failed",
        400
      );
    }

    // 4. Mark payment success
    const { error: updateError } =
      await supabaseService.markSessionPaymentSuccess(
        payment.razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );

    if (updateError) {
      console.error(
        "Session payment update failed:",
        updateError
      );

      return errorResponse(
        res,
        "Failed to update payment",
        500
      );
    }

    // 5. Mark session paid
    const { error: sessionError } =
      await printSessionService.markSessionPaid(
        payment.session_token
      );

    if (sessionError) {
      console.error(
        "Session paid update failed:",
        sessionError
      );

      return errorResponse(
        res,
        "Failed to update session",
        500
      );
    }

    return successResponse(
      res,
      {
        sessionToken: payment.session_token,
        status: "paid",
        amount: payment.amount,
        razorpayPaymentId: razorpay_payment_id,
      },
      "Session payment successful"
    );
  } catch (error) {
    next(error);
  }
};