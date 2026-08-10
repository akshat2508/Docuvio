import crypto from "crypto";
import supabaseService from "../services/supabase.service.js";
import printSessionService from "../services/printSession.service.js";
import { config } from "../config/env.js";
export const razorpayWebhook = async (req, res) => {
  try {
    // ============================================================
    // 1. WEBHOOK SIGNATURE VERIFICATION
    // ============================================================
    console.log("🔥🔥🔥 RAZORPAY WEBHOOK HIT 🔥🔥🔥");

    const webhookSecret =
      config.razorpay.webhookSecret;
      
    const signature =
      req.headers["x-razorpay-signature"];

    const body = req.body;

    if (!webhookSecret) {
      console.error(
        "❌ RAZORPAY_WEBHOOK_SECRET is missing"
      );

      return res.status(500).json({
        success: false,
        message: "Webhook secret not configured",
      });
    }

    if (!signature) {
      console.error(
        "❌ Missing Razorpay webhook signature"
      );

      return res.status(400).json({
        success: false,
        message: "Missing webhook signature",
      });
    }

    if (!Buffer.isBuffer(body)) {
      console.error(
        "❌ Razorpay webhook body is not raw Buffer"
      );

      return res.status(400).json({
        success: false,
        message: "Invalid webhook body",
      });
    }

    const expectedSignature =
      crypto
        .createHmac(
          "sha256",
          webhookSecret
        )
        .update(body)
        .digest("hex");

    if (expectedSignature !== signature) {
      console.error(
        "❌ Invalid Razorpay webhook signature"
      );

      return res.status(400).json({
        success: false,
        message: "Invalid webhook signature",
      });
    }

    // ============================================================
    // 2. PARSE EVENT
    // ============================================================

    const event = JSON.parse(
      body.toString("utf8")
    );

    console.log(
      "📩 Razorpay webhook:",
      event.event
    );

    // ============================================================
    // 3. WE ONLY HANDLE PAYMENT EVENTS FOR NOW
    // ============================================================

    if (
      event.event !== "payment.captured" &&
      event.event !== "payment.failed"
    ) {
      return res.json({
        received: true,
        ignored: true,
      });
    }

    // ============================================================
    // 4. EXTRACT PAYMENT
    // ============================================================

    const payment =
      event.payload?.payment?.entity;

    if (!payment) {
      console.error(
        "❌ Payment entity missing from webhook"
      );

      return res.status(400).json({
        success: false,
        message: "Payment entity missing",
      });
    }

    const razorpayOrderId =
      payment.order_id;

    const razorpayPaymentId =
      payment.id;

    if (!razorpayOrderId) {
      console.error(
        "❌ Razorpay order ID missing"
      );

      return res.status(400).json({
        success: false,
        message: "Razorpay order ID missing",
      });
    }

    // ============================================================
    // 5. PRINT SESSION PAYMENT?
    // ============================================================

    // const {
    //   data: sessionPayment,
    //   error: sessionPaymentError,
    // } =
    //   await printSessionService
    //     .getSessionPaymentByRazorpayOrder(
    //       razorpayOrderId
    //     );

    let sessionPayment;
let sessionPaymentError;

try {
  ({
    data: sessionPayment,
    error: sessionPaymentError,
  } = await printSessionService
    .getSessionPaymentByRazorpayOrder(
      razorpayOrderId
    ));
} catch (error) {
  console.error(
    "❌ Exception while looking up session payment:",
    error
  );

  return res.status(500).json({
    success: false,
    message: "Failed to lookup session payment",
  });
}

console.log("🔎 Session payment lookup:", {
  razorpayOrderId,
  found: !!sessionPayment,
  error: sessionPaymentError,
});

if (sessionPaymentError) {
  console.error(
    "❌ Session payment DB error:",
    sessionPaymentError
  );

  return res.status(500).json({
    success: false,
    message: "Failed to lookup session payment",
  });
}
    // ============================================================
    // 6. PRINT SESSION PAYMENT FOUND
    // ============================================================

    if (
      !sessionPaymentError &&
      sessionPayment
    ) {
      console.log(
        "🖨️ Print Session payment detected:",
        razorpayOrderId
      );

      // ----------------------------------------------------------
      // PAYMENT FAILED
      // ----------------------------------------------------------

      if (
        event.event === "payment.failed"
      ) {
        console.log(
          "❌ Print Session payment failed:",
          razorpayPaymentId
        );

        return res.json({
          received: true,
          type: "print_session",
          status: "payment_failed",
        });
      }

      // ----------------------------------------------------------
      // PAYMENT CAPTURED
      // ----------------------------------------------------------

      if (
        event.event === "payment.captured"
      ) {

        // --------------------------------------------------------
        // Idempotency
        // --------------------------------------------------------

        if (
          sessionPayment.status ===
          "captured"
        ) {
          console.log(
            "ℹ️ Print Session payment already processed"
          );

          return res.json({
            received: true,
            type: "print_session",
            status: "already_processed",
          });
        }

        // --------------------------------------------------------
        // Validate amount
        // --------------------------------------------------------

        const webhookAmount =
          Number(payment.amount) / 100;

        const databaseAmount =
          Number(sessionPayment.amount);

        if (
          webhookAmount !==
          databaseAmount
        ) {
          console.error(
            "❌ Print Session payment amount mismatch",
            {
              razorpayOrderId,
              webhookAmount,
              databaseAmount,
            }
          );

          return res.status(400).json({
            success: false,
            message: "Payment amount mismatch",
          });
        }

        // --------------------------------------------------------
        // Mark session payment successful
        // --------------------------------------------------------

        const {
          error: paymentUpdateError,
        } =
          await printSessionService
            .markSessionPaymentSuccess(
              razorpayOrderId,
              razorpayPaymentId,
              null,
              payment
            );

        if (paymentUpdateError) {
          console.error(
            "❌ Failed to update session payment:",
            paymentUpdateError
          );

          return res.status(500).json({
            success: false,
            message:
              "Failed to update session payment",
          });
        }

        // --------------------------------------------------------
        // Mark print session PAID
        // --------------------------------------------------------

        const {
          error: sessionUpdateError,
        } =
          await printSessionService
            .markSessionPaid(
              sessionPayment.session_token
            );

        if (sessionUpdateError) {
          console.error(
            "❌ Failed to mark print session paid:",
            sessionUpdateError
          );

          return res.status(500).json({
            success: false,
            message:
              "Failed to update print session",
          });
        }

        console.log(
          "✅ Print Session payment confirmed",
          {
            sessionToken:
              sessionPayment.session_token,
            razorpayOrderId,
            razorpayPaymentId,
            amount:
              databaseAmount,
          }
        );

        return res.json({
          received: true,
          type: "print_session",
          status: "paid",
        });
      }
    }

    // ============================================================
    // 7. EXISTING NORMAL ORDER PAYMENT FLOW
    // ============================================================

    if (
      event.event === "payment.captured"
    ) {
      console.log(
        "🛒 Normal order payment detected:",
        razorpayOrderId
      );

      await supabaseService
        .markPaymentWebhookSuccess(
          razorpayOrderId,
          razorpayPaymentId,
          payment
        );

      await supabaseService
        .markOrderPaidByRazorpayOrder(
          razorpayOrderId
        );
    }

    // ============================================================
    // 8. ACKNOWLEDGE WEBHOOK
    // ============================================================

    return res.json({
      received: true,
    });

  } catch (error) {
    console.error(
      "❌ Razorpay webhook error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Webhook processing failed",
    });
  }
};