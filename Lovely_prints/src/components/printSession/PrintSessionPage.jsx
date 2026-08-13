import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  connectPrintSession,
  getPrintSession,
  submitCustomerDetails,
  startFileUpload,
  uploadSessionFile,
  getSessionFiles,
  getSessionFileUrl,
} from "../../services/printSessionService";

import "./printSession.css";
import SessionQuotation from "../student/printSession/SessionQuotation";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const PRINT_SESSION_STORAGE_KEY = "docuvio_active_print_session";
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
];

const POLL_INTERVAL = 3000;

const STATUS_LABELS = {
  created: "Connecting",
  connected: "Ready",
  customer_details: "Your Details",
  files_uploading: "Upload Files",
  files_uploaded: "Waiting for Shop",
  reviewing: "Shop Reviewing",
  quote_ready: "Quotation Ready",
  payment_pending: "Payment Processing",
  paid: "Payment Confirmed",
  printing: "Printing",
  ready_for_pickup: "Ready for Pickup",
  completed: "Completed",
  expired: "Session Expired",
};

const SESSION_STEPS = [
  { key: "details", label: "Your Details" },
  { key: "upload", label: "Upload Files" },
  { key: "review", label: "Review & Quote" },
  { key: "payment", label: "Payment" },
];

const getSessionStepIndex = (currentStatus) => {
  if (["created", "connected", "customer_details"].includes(currentStatus)) return 0;
  if (["files_uploading", "files_uploaded"].includes(currentStatus)) return 1;
  if (["reviewing", "quote_ready"].includes(currentStatus)) return 2;
  if (
    ["payment_pending", "paid", "printing", "ready_for_pickup", "completed"].includes(
      currentStatus
    )
  ) return 3;
  return 0;
};

const POLLING_STATUSES = [
  "files_uploaded",
  "reviewing",
  "quote_ready",
  "payment_pending",
  "paid",
  "printing",
  "ready_for_pickup",
];

const PrintSessionPage = () => {
  const { sessionToken } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
  if (sessionToken) {
    localStorage.setItem(
      PRINT_SESSION_STORAGE_KEY,
      sessionToken
    );
  }
}, [sessionToken]);


useEffect(() => {
  const handleOnline = async () => {
    console.log(
      "Docuvio network restored. Reconnecting session..."
    );

    setError("");

    const restoredSession =
      await loadSession({
        silent: true,
      });

    if (
      restoredSession &&
      [
        "files_uploading",
        "files_uploaded",
        "reviewing",
      ].includes(restoredSession.status)
    ) {
      await loadFiles();
    }
  };

  window.addEventListener(
    "online",
    handleOnline
  );

  return () => {
    window.removeEventListener(
      "online",
      handleOnline
    );
  };
}, [sessionToken]);


  const fileInputRef = useRef(null);

  const [session, setSession] = useState(null);
  const [files, setFiles] = useState([]);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [loading, setLoading] = useState(true);
  const [submittingCustomer, setSubmittingCustomer] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [previewUrl, setPreviewUrl] = useState("");
  const [previewFile, setPreviewFile] = useState(null);

  const status = session?.status;

  const isExpired = status === "expired";

  const statusLabel = useMemo(
    () => STATUS_LABELS[status] || status || "Loading",
    [status]
  );

  const currentStepIndex = getSessionStepIndex(status);

  const canSubmitCustomer =
    customerName.trim().length >= 2 &&
    /^[0-9]{10}$/.test(customerPhone.trim()) &&
    !submittingCustomer;

  const canUpload =
    ["files_uploading", "files_uploaded"].includes(status) &&
    !uploading &&
    !isExpired;

  // ============================================================
  // LOAD SESSION
  // ============================================================

const loadSession = async ({ silent = false } = {}) => {
  try {
    if (!silent) {
      setLoading(true);
      setError("");
    }

    const response =
      await getPrintSession(sessionToken);

    if (!response?.success) {
      throw new Error(
        response?.message ||
          "Unable to load print session"
      );
    }

    setSession(response.data);

    if (response.data?.customer_name) {
      setCustomerName(
        response.data.customer_name
      );
    }

    if (response.data?.customer_phone) {
      setCustomerPhone(
        response.data.customer_phone
      );
    }

    return response.data;

  } catch (err) {
    console.error(
      "Failed to load print session:",
      err
    );

    // ==========================================
    // NETWORK FAILURE
    // ==========================================

    if (!err.response) {
      setError(
        "Connection lost. Your print session is safe. Reconnecting..."
      );

      return null;
    }

    // ==========================================
    // REAL BACKEND ERROR
    // ==========================================

    if (!silent) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to load this print session."
      );
    }

    return null;

  } finally {
    if (!silent) {
      setLoading(false);
    }
  }
};


  // ============================================================
  // LOAD FILES
  // ============================================================

  const loadFiles = async () => {
    try {
      const response = await getSessionFiles(sessionToken);

      if (response?.success) {
        setFiles(response.data || []);
      }
    } catch (err) {
      console.error("Failed to load session files:", err);
    }
  };

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    if (!sessionToken) {
      setError("Invalid print session.");
      setLoading(false);
      return;
    }

    loadSession();
  }, [sessionToken]);

  // ============================================================
  // CONNECT CREATED SESSION
  // ============================================================

  useEffect(() => {
    if (status !== "created" || connecting) {
      return;
    }

    const connect = async () => {
      try {
        setConnecting(true);
        setError("");

        const response =
          await connectPrintSession(sessionToken);

        if (!response?.success) {
          throw new Error(
            response?.message ||
              "Unable to connect print session"
          );
        }

        setSession(response.data);
      } catch (err) {
        console.error(
          "Print session connection error:",
          err
        );

        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Unable to connect this print session."
        );
      } finally {
        setConnecting(false);
      }
    };

    connect();
  }, [status, sessionToken, connecting]);

  // ============================================================
  // LOAD FILES WHEN RELEVANT
  // ============================================================

  useEffect(() => {
    if (
      ["files_uploading", "files_uploaded", "reviewing"].includes(
        status
      )
    ) {
      loadFiles();
    }
  }, [status, sessionToken]);

  // ============================================================
  // SESSION POLLING
  // ============================================================

  useEffect(() => {
    if (!sessionToken || !POLLING_STATUSES.includes(status)) {
      return;
    }

    const interval = setInterval(async () => {
  if (!navigator.onLine) {
    return;
  }

  const latestSession =
    await loadSession({
      silent: true,
    });

  if (
    latestSession &&
    [
      "files_uploading",
      "files_uploaded",
      "reviewing",
    ].includes(latestSession.status)
  ) {
    await loadFiles();
  }
}, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [sessionToken, status]);

  // ============================================================
  // CUSTOMER DETAILS
  // ============================================================

  const handleCustomerSubmit = async (event) => {
    event.preventDefault();

    if (!canSubmitCustomer) {
      return;
    }

    try {
      setSubmittingCustomer(true);
      setError("");
      setSuccessMessage("");

      const response = await submitCustomerDetails(
  sessionToken,
  customerName.trim(),
  customerPhone.trim()
);

if (!response?.success) {
  throw new Error(
    response?.message ||
      "Unable to save customer details"
  );
}

// Customer details are saved.
// Now explicitly start the file-upload phase.
const uploadResponse =
  await startFileUpload(sessionToken);

if (!uploadResponse?.success) {
  throw new Error(
    uploadResponse?.message ||
      "Unable to start file upload"
  );
}

setSession(uploadResponse.data);

setSuccessMessage(
  "Your details have been saved. You can now upload your files."
);
    } catch (err) {
      console.error(
        "Customer details error:",
        err
      );

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to save your details."
      );
    } finally {
      setSubmittingCustomer(false);
    }
  };

  // ============================================================
  // START FILE UPLOAD
  // ============================================================

  const handleStartUpload = async () => {
    try {
      setError("");
      setSuccessMessage("");

      const response =
        await startFileUpload(sessionToken);

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Unable to start file upload"
        );
      }

      setSession(response.data);
    } catch (err) {
      console.error(
        "Start upload error:",
        err
      );

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to start file upload."
      );
    }
  };

  // ============================================================
  // FILE VALIDATION
  // ============================================================

  const validateFile = (file) => {
    if (!file) {
      return "No file selected.";
    }

    if (file.size > MAX_FILE_SIZE) {
      return `${file.name} is larger than 10MB.`;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return `${file.name} has an unsupported file type.`;
    }

    return null;
  };

  // ============================================================
  // FILE UPLOAD
  // ============================================================

  const handleFileSelection = async (event) => {
    const selectedFiles = Array.from(
      event.target.files || []
    );

    if (!selectedFiles.length) {
      return;
    }

    setError("");
    setSuccessMessage("");

    try {
      setUploading(true);

      // Validate everything before uploading anything.
      for (const file of selectedFiles) {
        const validationError =
          validateFile(file);

        if (validationError) {
          throw new Error(validationError);
        }
      }

      // Start upload if required.
      if (session?.status === "customer_details") {
        const response =
          await startFileUpload(sessionToken);

        if (!response?.success) {
          throw new Error(
            response?.message ||
              "Unable to start file upload"
          );
        }

        setSession(response.data);
      }

      // Upload sequentially.
      for (const file of selectedFiles) {
        await uploadSessionFile(
          sessionToken,
          file
        );
      }

      await loadFiles();

      const latestSession =
        await loadSession();

      if (latestSession?.status === "files_uploaded") {
        setSuccessMessage(
          "Your files are uploaded and have been sent to the shop."
        );
      } else {
        setSuccessMessage(
          selectedFiles.length === 1
            ? "File uploaded successfully."
            : `${selectedFiles.length} files uploaded successfully.`
        );
      }
    } catch (err) {
      console.error(
        "File upload error:",
        err
      );

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to upload file."
      );
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // ============================================================
  // FILE PREVIEW
  // ============================================================

  const handlePreview = async (file) => {
    try {
      setError("");

      const url =
        await getSessionFileUrl(file.id);

      setPreviewUrl(url);
      setPreviewFile(file);
    } catch (err) {
      console.error(
        "Preview error:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Unable to generate preview URL."
      );
    }
  };

  const closePreview = () => {
    setPreviewUrl("");
    setPreviewFile(null);
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="print-session-page docuvio-session-theme">
        <div className="print-session-container">
          <div className="session-card session-loading">
            <div className="session-spinner" />
            <p>Loading print session...</p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // SESSION ERROR
  // ============================================================

  if (!session) {
  return (
    <div className="print-session-page">
      <div className="session-card session-error-card docuvio-card">
        <div className="session-error-icon">
          !
        </div>

        <h2>
          {navigator.onLine
            ? "Unable to open session"
            : "Connection lost"}
        </h2>

        <p>
          {navigator.onLine
            ? (
                error ||
                "Print session could not be loaded."
              )
            : (
                "Your print session has not been lost. "
                + "We're waiting for the connection to return."
              )}
        </p>

        <button
          className="session-primary-btn docuvio-btn-primary"
          onClick={() =>
            loadSession()
          }
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

  return (
    <>
      <div className="print-session-page">
        <div className="print-session-container">

          {/* ==================================================
              DOCUVIO SESSION JOURNEY
          ================================================== */}

          {!isExpired && (
            <section
              className="session-workflow"
              aria-label="Print session progress"
            >
              <div className="session-workflow-header">
                <div>
                  <span className="session-workflow-eyebrow">
                    PRINT SESSION
                  </span>

                  <strong>
                    {session.shop?.shop_name ||
                      session.shop_name ||
                      "Print Shop"}
                  </strong>
                </div>

                <span className="session-workflow-count">
                  Step {currentStepIndex + 1} of {SESSION_STEPS.length}
                </span>
              </div>

              <div className="session-timeline">
                {SESSION_STEPS.map((step, index) => {
                  const isActive = index === currentStepIndex;
                  const isComplete = index < currentStepIndex;
                  const isLast = index === SESSION_STEPS.length - 1;

                  return (
                    <div
                      className={`session-timeline-step ${
                        isActive ? "active" : ""
                      } ${isComplete ? "complete" : ""}`}
                      key={step.key}
                    >
                      <div className="session-timeline-marker">
                        <span>
                          {isComplete ? "✓" : index + 1}
                        </span>

                        {!isLast && (
                          <i
                            className={
                              isComplete
                                ? "session-timeline-line complete"
                                : "session-timeline-line"
                            }
                          />
                        )}
                      </div>

                      <div className="session-timeline-copy">
                        <span className="session-timeline-label">
                          {step.label}
                        </span>

                        {isActive && (
                          <span className="session-timeline-current">
                            YOU ARE HERE
                          </span>
                        )}

                        {isComplete && (
                          <span className="session-timeline-complete">
                            Completed
                          </span>
                        )}

                        {index > currentStepIndex && (
                          <span className="session-timeline-upcoming">
                            Up next
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="session-workflow-summary">
                <div className="session-workflow-summary-icon">
                  {currentStepIndex + 1}
                </div>

                <div className="session-workflow-summary-copy">
                  <span>CURRENT STEP</span>
                  <strong>
                    {SESSION_STEPS[currentStepIndex]?.label}
                  </strong>
                  <p>{statusLabel}</p>
                </div>

                <div className="session-workflow-next">
                  <span>NEXT</span>
                  <strong>
                    {currentStepIndex < SESSION_STEPS.length - 1
                      ? SESSION_STEPS[currentStepIndex + 1].label
                      : "Session completion"}
                  </strong>
                </div>
              </div>
            </section>
          )}

          {/* ==================================================
              HEADER
          ================================================== */}

          <header className="session-header">
            <div className="session-header-copy">
              <span className="session-eyebrow">
                PRINT REQUEST
              </span>

              <h1>
                Complete your print request
              </h1>

              <p>
                Follow the four steps below. We'll keep
                you updated as your request moves forward.
              </p>
            </div>

            <div className="session-status">
              <span
                className={`status-dot ${
                  status === "paid"
                    ? "status-dot-success"
                    : ""
                }`}
              />

              {statusLabel}
            </div>
          </header>

          {/* ==================================================
              ALERTS
          ================================================== */}

          {error && (
            <div className="session-alert session-alert-error">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="session-alert session-alert-success">
              {successMessage}
            </div>
          )}

          <div className="session-content-grid">
            <main className="session-main-content">

          {/* ==================================================
              EXPIRED
          ================================================== */}

          {isExpired && (
            <section className="session-card session-expired">
              <div className="state-icon state-icon-error">
                !
              </div>

              <h2>
                Print Session Expired
              </h2>

              <p>
                This session is no longer active.
                Please scan the shop QR code again
                to start a new print session.
              </p>
            </section>
          )}

          {/* ==================================================
              CUSTOMER DETAILS
          ================================================== */}

          {!isExpired &&
            ["created", "connected", "customer_details"].includes(
              status
            ) && (
              <section className="session-card">

                <div className="section-heading">
                  <div className="section-number">
                    1
                  </div>

                  <div>
                    <h2>
                      Your details
                    </h2>

                    <p>
                      Enter your name and phone
                      number so the shop knows who
                      the print request belongs to.
                    </p>
                  </div>
                </div>

                {status === "created" && (
                  <div className="session-start-card">
                    <div className="session-start-icon">
                      <span>●</span>
                    </div>

                    <div className="session-start-copy">
                      <span>STARTING YOUR SESSION</span>

                      <h3>
                        Connecting you to {session.shop?.shop_name ||
                          session.shop_name ||
                          "the print shop"}
                      </h3>

                      <p>
                        Docuvio is securely opening your print session.
                        This usually takes just a moment.
                      </p>

                      <div className="session-start-progress">
                        <i />
                      </div>
                    </div>

                    <div className="session-start-status">
                      Connecting
                    </div>
                  </div>
                )}

                {status !== "created" && (
                  <form
                    onSubmit={handleCustomerSubmit}
                  >
                    <div className="session-form-grid">

                      <div className="session-field">
                        <label htmlFor="customer-name">
                          Full Name
                        </label>

                        <input
                          id="customer-name"
                          type="text"
                          value={customerName}
                          onChange={(event) =>
                            setCustomerName(
                              event.target.value
                            )
                          }
                          placeholder="Enter your name"
                          disabled={
                            submittingCustomer
                          }
                          autoComplete="name"
                        />
                      </div>

                      <div className="session-field">
                        <label htmlFor="customer-phone">
                          Phone Number
                        </label>

                        <input
                          id="customer-phone"
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          value={customerPhone}
                          onChange={(event) =>
                            setCustomerPhone(
                              event.target.value.replace(
                                /\D/g,
                                ""
                              )
                            )
                          }
                          placeholder="10-digit mobile number"
                          disabled={
                            submittingCustomer
                          }
                          autoComplete="tel"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="session-primary-btn docuvio-btn-primary"
                      disabled={!canSubmitCustomer}
                    >
                      {submittingCustomer
                        ? "Saving..."
                        : "Continue"}
                    </button>
                  </form>
                )}
              </section>
            )}

          {/* ==================================================
              UPLOAD
          ================================================== */}

          {!isExpired &&
            ["files_uploading", "files_uploaded"].includes(
              status
            ) && (
              <section className="session-card">

                <div className="section-heading">
                  <div className="section-number">
                    2
                  </div>

                  <div>
                    <h2>
                      Upload your files
                    </h2>

                    <p>
                      Select all the documents you
                      want the shop to print.
                    </p>
                  </div>
                </div>

                {["files_uploading", "files_uploaded"].includes(status) && (
                  <div
                    className={`session-upload-box ${
                      uploading
                        ? "uploading"
                        : ""
                    }`}
                    onClick={() =>
                      !uploading &&
                      canUpload &&
                      fileInputRef.current?.click()
                    }
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      hidden
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={
                        handleFileSelection
                      }
                      disabled={uploading}
                    />

                    <div className="upload-icon">
                      ↑
                    </div>

                    <h3>
                      {uploading
                        ? "Uploading files..."
                        : "Choose your files"}
                    </h3>

                    <p>
                      PDF, DOC, DOCX, JPG or PNG
                    </p>

                    <span>
                      Maximum 10MB per file
                    </span>
                  </div>
                )}

                {files.length > 0 && (
                  <div className="session-files-section">

                    <div className="files-header">
                      <h3>
                        Uploaded Files
                      </h3>

                      <span>
                        {files.length}{" "}
                        {files.length === 1
                          ? "file"
                          : "files"}
                      </span>
                    </div>

                    <div className="session-file-list">
                      {files.map((file) => (
                        <div
                          className="session-file-item"
                          key={file.id}
                        >
                          <div className="file-info">
                            <div className="file-icon">
                              {file.file_name
                                ?.split(".")
                                .pop()
                                ?.toUpperCase() ||
                                "FILE"}
                            </div>

                            <div>
                              <strong>
                                {file.file_name}
                              </strong>

                              <span>
                                {file.file_size
                                  ? `${(
                                      file.file_size /
                                      1024 /
                                      1024
                                    ).toFixed(2)} MB`
                                  : "Uploaded"}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="file-preview-btn docuvio-btn-secondary"
                            onClick={() =>
                              handlePreview(file)
                            }
                          >
                            Preview
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

          {/* ==================================================
              WAITING FOR SHOP
          ================================================== */}

          {status === "files_uploaded" && (
            <section className="session-card session-state-card">
              <div className="state-icon state-icon-success">
                ✓
              </div>

              <div>
                <span className="state-eyebrow">
                  FILES RECEIVED
                </span>

                <h2>
                  Your files are with the shop
                </h2>

                <p>
                  The shop will review your files
                  and send the final print quotation
                  here.
                </p>
              </div>

              <div className="state-pulse">
                <span />
                Waiting for shop
              </div>
            </section>
          )}

          {/* ==================================================
              SHOP REVIEWING
          ================================================== */}

          {status === "reviewing" && (
            <section className="session-card session-state-card">
              <div className="state-icon state-icon-review">
                …
              </div>

              <div>
                <span className="state-eyebrow">
                  SHOP REVIEW
                </span>

                <h2>
                  The shop is reviewing your files
                </h2>

                <p>
                  Your documents have been received.
                  The final quotation will appear here
                  once the shop finishes reviewing them.
                </p>
              </div>

              <div className="state-pulse">
                <span />
                Reviewing
              </div>
            </section>
          )}

          {/* ==================================================
              QUOTE
          ================================================== */}

          {status === "quote_ready" && (
            <SessionQuotation
              session={session}
              onPaymentStarted={() => {
                setSession((previous) => ({
                  ...previous,
                  status: "payment_pending",
                }));
              }}
            />
          )}

          {/* ==================================================
              PAYMENT PENDING
          ================================================== */}

          {status === "payment_pending" && (
            <section className="session-card session-state-card payment-state-card">

              <div className="state-icon state-icon-payment">
                ₹
              </div>

              <div>
                <span className="state-eyebrow">
                  PAYMENT
                </span>

                <h2>
                  Confirming your payment
                </h2>

                <p>
                  Your payment has been submitted.
                  We are waiting for the Razorpay
                  payment confirmation.
                </p>

                <small>
                  This page will update automatically.
                </small>
              </div>

              <div className="session-spinner small" />
            </section>
          )}

          {/* ==================================================
              PAID
          ================================================== */}

          {status === "paid" && (
            <section className="session-card session-state-card">

              <div className="state-icon state-icon-success">
                ✓
              </div>

              <div>
                <span className="state-eyebrow">
                  PAYMENT CONFIRMED
                </span>

                <h2>
                  Your print request is paid
                </h2>

                <p>
                  Payment has been confirmed.
                  The shop can now start printing
                  your documents.
                </p>
              </div>
            </section>
          )}

          {/* ==================================================
              PRINTING
          ================================================== */}

          {status === "printing" && (
            <section className="session-card session-state-card">

              <div className="state-icon state-icon-print">
                ▣
              </div>

              <div>
                <span className="state-eyebrow">
                  PRINTING
                </span>

                <h2>
                  Your documents are being printed
                </h2>

                <p>
                  The shop is currently processing
                  your print request.
                </p>
              </div>

              <div className="state-pulse">
                <span />
                Printing
              </div>
            </section>
          )}

          {/* ==================================================
              READY
          ================================================== */}

          {status === "ready_for_pickup" && (
            <section className="session-card session-state-card">

              <div className="state-icon state-icon-success">
                ✓
              </div>

              <div>
                <span className="state-eyebrow">
                  READY
                </span>

                <h2>
                  Your prints are ready
                </h2>

                <p>
                  Your documents have been printed
                  and are ready for pickup from the
                  shop.
                </p>
              </div>
            </section>
          )}

          {/* ==================================================
              COMPLETED
          ================================================== */}

          {status === "completed" && (
            <section className="session-card session-state-card">

              <div className="state-icon state-icon-success">
                ✓
              </div>

              <div>
                <span className="state-eyebrow">
                  COMPLETED
                </span>

                <h2>
                  Print session completed
                </h2>

                <p>
                  Your print session has been
                  successfully completed.
                </p>
              </div>
            </section>
          )}

            </main>

            {!isExpired && (
              <aside className="session-side-panel">
                <div className="session-side-card session-side-current">
                  <span className="session-side-eyebrow">
                    CURRENT STEP
                  </span>

                  <div className="session-side-number">
                    {currentStepIndex + 1}
                  </div>

                  <h3>
                    {SESSION_STEPS[currentStepIndex]?.label}
                  </h3>

                  <p>
                    {statusLabel}
                  </p>
                </div>

                <div className="session-side-card">
                  <span className="session-side-eyebrow">
                    COMING NEXT
                  </span>

                  <h3>
                    {currentStepIndex < SESSION_STEPS.length - 1
                      ? SESSION_STEPS[currentStepIndex + 1].label
                      : "Complete your print session"}
                  </h3>

                  <p>
                    {currentStepIndex < SESSION_STEPS.length - 1
                      ? "Finish the current step and Docuvio will move you forward automatically."
                      : "Your request has reached the final stage."}
                  </p>
                </div>

                <div className="session-side-card session-side-shop">
                  <span className="session-side-eyebrow">
                    PRINT SHOP
                  </span>

                  <h3>
                    {session.shop?.shop_name ||
                      session.shop_name ||
                      "Print Shop"}
                  </h3>

                  {session.shop?.level && (
                    <p>
                      Level {session.shop.level}
                    </p>
                  )}

                  <span className="session-side-status">
                    <i />
                    {statusLabel}
                  </span>
                </div>
              </aside>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================
          PREVIEW MODAL
      ====================================================== */}

      {previewUrl && previewFile && (
        <div
          className="session-preview-overlay"
          onClick={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closePreview();
            }
          }}
        >
          <div className="session-preview-modal">

            <div className="preview-header">
              <strong>
                {previewFile.file_name}
              </strong>

              <button
                type="button"
                className="preview-close"
                onClick={closePreview}
              >
                ×
              </button>
            </div>

            <div className="preview-content">

              {previewFile.file_name
                ?.toLowerCase()
                .match(/\.(jpg|jpeg|png)$/) ? (
                <img
                  src={previewUrl}
                  alt={previewFile.file_name}
                />
              ) : previewFile.file_name
                  ?.toLowerCase()
                  .endsWith(".pdf") ? (
                <iframe
                  src={previewUrl}
                  title={previewFile.file_name}
                />
              ) : (
                <div className="unsupported-preview">
                  <h3>
                    Preview unavailable
                  </h3>

                  <p>
                    This file type cannot be previewed
                    directly in the browser.
                  </p>

                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="session-primary-btn docuvio-btn-primary"
                  >
                    Open File
                  </a>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PrintSessionPage;