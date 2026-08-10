import { useState } from "react";
import { startSessionPayment } from "./sessionPayment";

const PaymentTest = () => {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    try {
      setLoading(true);

      await startSessionPayment({
        sessionToken:
          "76b8700b-5801-41eb-84ae-9219b3ead7bc",

        customerName: "Akshat",

        customerPhone: "9876543210",

        onSuccess: (data) => {
          console.log("✅ PAYMENT SUCCESS:", data);
        },

        onFailure: (error) => {
          console.error("❌ PAYMENT FAILED:", error);
        },
      });
    } catch (error) {
      console.error("❌ PAYMENT ERROR:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "30px" }}>
      <h2>Phase 2D Payment Test</h2>

      <p>
        Session:
        <br />
        76b8700b-5801-41eb-84ae-9219b3ead7bc
      </p>

      <p>Quotation: ₹450</p>

      <button
        onClick={handlePayment}
        disabled={loading}
      >
        {loading
          ? "Opening Razorpay..."
          : "Pay ₹450"}
      </button>
    </div>
  );
};

export default PaymentTest;