import api from "./api";


// ==========================================
// FILE UPLOAD
// ==========================================

export const startFileUpload = async (
  sessionToken
) => {
  const res = await api.post(
    `/print-sessions/session/${sessionToken}/files/start`
  );

  return res.data;
};


export const uploadSessionFile = async (
  sessionToken,
  file
) => {
  const formData = new FormData();

  formData.append("file", file);

  const res = await api.post(
    `/print-sessions/session/${sessionToken}/files`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return res.data;
};


export const getSessionFiles = async (
  sessionToken
) => {
  const res = await api.get(
    `/print-sessions/session/${sessionToken}/files`
  );

  return res.data;
};


export const getSessionFileUrl = async (
  fileId
) => {
  const res = await api.get(
    `/print-sessions/files/${fileId}/url`
  );

  return res.data.data.url;
};

// ==========================================
// CUSTOMER DETAILS
// ==========================================

export const submitCustomerDetails = async (
  sessionToken,
  customerName,
  customerPhone
) => {
  const res = await api.patch(
    `/print-sessions/session/${sessionToken}/customer`,
    {
      customerName: customerName,
      customerPhone: customerPhone,
    }
  );

  return res.data;
};

// ==========================================
// SESSION
// ==========================================

export const getPrintSession = async (sessionToken) => {
  const res = await api.get(
    `/print-sessions/session/${sessionToken}`
  );

  return res.data;
};

// ==========================================
// SHOP PRINT SESSIONS
// ==========================================

export const getShopPrintSessions = async () => {
  const res = await api.get(
    "/print-sessions/shop/sessions"
  );

  return res.data;
};

export const startSessionReview = async (
  sessionToken
) => {
  const res = await api.post(
    `/print-sessions/session/${sessionToken}/review`
  );

  return res.data;
};

export const submitSessionQuote = async (
  sessionToken,
  quotedAmount
) => {
  const res = await api.post(
    `/print-sessions/session/${sessionToken}/quote`,
    {
      quoted_amount: Number(quotedAmount),
    }
  );

  return res.data;
};

// ==========================================
// CUSTOMER QUOTE
// ==========================================

export const getSessionQuote = async (
  sessionToken
) => {
  const res = await api.get(
    `/print-sessions/session/${sessionToken}/quote`
  );

  return res.data;
};

// ==========================================
// SESSION PAYMENT
// ==========================================

export const createSessionPaymentOrder = async (
  sessionToken
) => {
  const res = await api.post(
    `/print-sessions/session/${sessionToken}/payment/create`
  );

  return res.data;
};

export const verifySessionPayment = async (
  payload
) => {
  const res = await api.post(
    "/print-sessions/session/payment/verify",
    payload
  );

  return res.data;
};

