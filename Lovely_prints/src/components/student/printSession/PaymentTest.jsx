
import { useState } from "react";
import { startSessionPayment } from "./sessionPayment";

// Paste the session_token returned by:
// SELECT * FROM public.create_test_print_session(...);

const TEST_SESSION_TOKEN =
  "6af5ca35-a3d2-4c98-8a9f-d366790a3ca1";

const TEST_CUSTOMER_NAME = "Akshat";
const TEST_CUSTOMER_PHONE = "9596571744";
const TEST_AMOUNT = 450;

const PaymentTest = () => {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    try {
      setLoading(true);

      console.log("Starting payment...");
      console.log("Session:", TEST_SESSION_TOKEN);
      console.log("Customer:", TEST_CUSTOMER_NAME);
      console.log("Amount:", TEST_AMOUNT);

      await startSessionPayment({
        sessionToken: TEST_SESSION_TOKEN,

        customerName: TEST_CUSTOMER_NAME,

        customerPhone: TEST_CUSTOMER_PHONE,

        onSuccess: (data) => {
          console.log(
            "✅ PAYMENT SUCCESS:",
            data
          );
        },

        onFailure: (error) => {
          console.error(
            "❌ PAYMENT FAILED:",
            error
          );
        },
      });
    } catch (error) {
      console.error(
        "❌ PAYMENT ERROR:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "30px" }}>
      <h2>Phase 2D Payment Test</h2>

      <p>
        <strong>Session:</strong>
        <br />
        {TEST_SESSION_TOKEN}
      </p>

      <p>
        <strong>Customer:</strong>{" "}
        {TEST_CUSTOMER_NAME}
      </p>

      <p>
        <strong>Phone:</strong>{" "}
        {TEST_CUSTOMER_PHONE}
      </p>

      <p>
        <strong>Quotation:</strong> ₹{TEST_AMOUNT}
      </p>

      <button
        onClick={handlePayment}
        disabled={
          loading ||
          !TEST_SESSION_TOKEN ||
          TEST_SESSION_TOKEN ===
            "PASTE_SESSION_TOKEN_HERE"
        }
      >
        {loading
          ? "Opening Razorpay..."
          : `Pay ₹${TEST_AMOUNT}`}
      </button>
    </div>
  );
};

export default PaymentTest;

