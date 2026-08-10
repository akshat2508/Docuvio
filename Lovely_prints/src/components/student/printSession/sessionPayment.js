import api from "../../../services/api";

export const createSessionPayment = async (sessionToken) => {
  const res = await api.post(
    `/print-sessions/session/${sessionToken}/payment/create`,
    {}
  );

  return res.data;
};

export const startSessionPayment = async ({
  sessionToken,
  customerName,
  customerPhone,
  onSuccess,
  onFailure,
}) => {
  try {
    const response = await createSessionPayment(sessionToken);

    const payment = response.data.payment;

    if (!payment?.razorpay_order_id) {
      throw new Error("Razorpay order ID missing");
    }

    if (!window.Razorpay) {
      throw new Error("Razorpay Checkout SDK not loaded");
    }

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,

      amount: Number(payment.amount) * 100,

      currency: "INR",

      name: "Docuvio",

      description: "Print Session Payment",

      order_id: payment.razorpay_order_id,

      prefill: {
        name: customerName || "",
        contact: customerPhone || "",
      },

      handler: (response) => {
        console.log(
          "Razorpay frontend success:",
          response
        );

        /*
         * IMPORTANT:
         * DO NOT mark the session paid here.
         *
         * Webhook verification will do that later.
         */

        onSuccess?.(response);
      },

      modal: {
        ondismiss: () => {
          console.log("Razorpay checkout closed");
        },
      },
    };

    const razorpay = new window.Razorpay(options);

    razorpay.on("payment.failed", (response) => {
      console.error(
        "Razorpay payment failed:",
        response.error
      );

      onFailure?.(
        response.error?.description ||
        "Payment failed"
      );
    });

    razorpay.open();
  } catch (error) {
    console.error(
      "Session payment initialization error:",
      error
    );

    onFailure?.(
      error?.response?.data?.message ||
      error.message ||
      "Unable to initialize payment"
    );
  }
};