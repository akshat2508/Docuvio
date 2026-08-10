import { useState } from "react";
import { startSessionPayment } from "./sessionPayment";

const SessionQuotation = ({
  session,
  onPaid,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePayment = async () => {
    if (!session?.quoted_amount) return;

    setLoading(true);
    setError("");

    await startSessionPayment({
      sessionToken: session.session_token,

      customerName:
        session.customer_name || "",

      customerPhone:
        session.customer_phone || "",

      onSuccess: (data) => {
        setLoading(false);
        onPaid?.(data);
      },

      onFailure: (message) => {
        setLoading(false);
        setError(message);
      },
    });
  };

  return (
    <section className="session-quotation-card">
      <div>
        <span>SHOP QUOTATION</span>

        <h2>
          ₹{Number(
            session.quoted_amount
          ).toFixed(2)}
        </h2>

        <p>
          This is the final amount provided
          by the print shop.
        </p>
      </div>

      {error && (
        <div className="session-payment-error">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handlePayment}
        disabled={loading}
      >
        {loading
          ? "Preparing Payment..."
          : `Pay ₹${Number(
              session.quoted_amount
            ).toFixed(2)}`}
      </button>
    </section>
  );
};

export default SessionQuotation;