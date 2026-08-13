const PRINT_SESSION_STATUS_FLOW = {
  created: ["connected", "expired"],

  connected: ["customer_details", "expired"],

  customer_details: ["files_uploading", "expired"],

  files_uploading: ["files_uploaded", "reviewing", "expired"],

  files_uploaded: ["reviewing", "files_uploading", "expired"],

  reviewing: ["quote_ready", "files_uploading", "expired"],

  quote_ready: ["payment_pending", "reviewing", "expired"],

  payment_pending: ["paid", "quote_ready", "expired"],

  paid: ["printing"],

  printing: ["ready_for_pickup"],

  ready_for_pickup: ["completed"],

  completed: ["archived"],

  archived: [],

  expired: [],
};


/**
 * Check whether a session status transition is valid.
 *
 * @param {string} currentStatus
 * @param {string} nextStatus
 * @returns {boolean}
 */
export const isValidPrintSessionTransition = (
  currentStatus,
  nextStatus
) => {
  return (
    PRINT_SESSION_STATUS_FLOW[currentStatus]?.includes(nextStatus) ??
    false
  );
};


/**
 * Get all statuses that may follow the current status.
 *
 * @param {string} currentStatus
 * @returns {string[]}
 */
export const getAllowedPrintSessionTransitions = (currentStatus) => {
  return PRINT_SESSION_STATUS_FLOW[currentStatus] || [];
};


export default PRINT_SESSION_STATUS_FLOW;