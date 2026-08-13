import { useState } from "react";
import { startSessionPayment } from "./sessionPayment";

const SessionQuotation = ({
  session,
  onPaymentStarted,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const amount = Number(session?.quoted_amount || 0);

  const handlePayment = async () => {
    if (!amount || amount <= 0 || loading) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      await startSessionPayment({
        sessionToken: session.session_token,

        customerName:
          session.customer_name || "",

        customerPhone:
          session.customer_phone || "",

        onSuccess: () => {
          /*
           * IMPORTANT:
           *
           * Razorpay Checkout success does NOT
           * mean the database says "paid".
           *
           * The webhook is authoritative.
           *
           * We only move the UI to
           * payment_pending here.
           */
          setLoading(false);

          onPaymentStarted?.();
        },

        onFailure: (message) => {
          setLoading(false);

          setError(
            message ||
              "Payment was not completed. Please try again."
          );
        },
      });
    } catch (err) {
      console.error(
        "Payment initialization error:",
        err
      );

      setLoading(false);

      setError(
        err?.message ||
          "Unable to start payment."
      );
    }
  };

  return (
    <section className="session-card session-quotation-card">

      <div className="quotation-header">
        <div>
          <span className="state-eyebrow">
            QUOTATION READY
          </span>

          <h2>
            Your print quotation
          </h2>

          <p>
            The print shop has reviewed your
            documents and provided the final amount.
          </p>
        </div>
      </div>

      <div className="quotation-amount">
        <span>Final amount</span>

        <strong>
          ₹{amount.toFixed(2)}
        </strong>
      </div>

      {error && (
        <div className="session-alert session-alert-error">
          {error}
        </div>
      )}

      <button
        type="button"
        className="session-primary-btn quotation-pay-btn"
        onClick={handlePayment}
        disabled={loading || !amount}
      >
        {loading
          ? "Opening Payment..."
          : `Pay ₹${amount.toFixed(2)}`}
      </button>

      <p className="quotation-note">
        You'll be redirected to Razorpay's secure
        checkout.
      </p>
    </section>
  );
};

export default SessionQuotation;