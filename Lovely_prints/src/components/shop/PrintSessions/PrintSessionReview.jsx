import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  IndianRupee,
  UserRound,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";

import {
  getPrintSession,
  getSessionFiles,
  getSessionFileUrl,
  startSessionReview,
  submitSessionQuote,
} from "../../../services/printSessionService";

import "./printSessions.css";

/* =========================================================
   HELPERS
========================================================= */

const formatFileSize = (bytes) => {
  if (!bytes) return "Unknown size";

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const getFileExtension = (fileName = "") => {
  const parts = fileName.split(".");

  return parts.length > 1
    ? parts[parts.length - 1].toUpperCase()
    : "FILE";
};

const formatDate = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatStatus = (status = "") =>
  status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const PAID_STATUSES = [
  "paid",
  "printing",
  "ready_for_pickup",
  "completed",
];

const isPaidStatus = (status) =>
  PAID_STATUSES.includes(status);

const getReviewStage = (status) => {
  if (
    [
      "created",
      "connected",
      "customer_details",
      "files_uploading",
      "files_uploaded",
    ].includes(status)
  ) {
    return 1;
  }

  if (status === "reviewing") {
    return 2;
  }

  if (
    status === "quote_ready" ||
    status === "payment_pending"
  ) {
    return 3;
  }

  if (PAID_STATUSES.includes(status)) {
    return 4;
  }

  return 1;
};

/* =========================================================
   COMPONENT
========================================================= */

const PrintSessionReview = ({
  session,
  onClose,
  onUpdated,
}) => {
  const [sessionData, setSessionData] = useState(session);
  const [files, setFiles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* FILE PREVIEW */
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  /* QUOTATION */
  const [quotedAmount, setQuotedAmount] = useState(
    session?.quoted_amount || ""
  );

  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [quoteSuccess, setQuoteSuccess] = useState("");

  /* =======================================================
     LOAD SESSION
  ======================================================= */

  useEffect(() => {
    const loadReviewData = async () => {
      if (!session?.session_token) {
        setError("Print session token is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [
          sessionResponse,
          filesResponse,
        ] = await Promise.all([
          getPrintSession(session.session_token),
          getSessionFiles(session.session_token),
        ]);

        const updatedSession =
          sessionResponse?.data || session;

        setSessionData(updatedSession);

        setQuotedAmount(
          updatedSession?.quoted_amount || ""
        );

        setFiles(filesResponse?.data || []);
      } catch (err) {
        console.error(
          "Failed to load print session review:",
          err
        );

        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load print session."
        );
      } finally {
        setLoading(false);
      }
    };

    loadReviewData();
  }, [session]);

  /* =======================================================
     FILE PREVIEW
  ======================================================= */

  const handlePreview = async (file) => {
    try {
      setPreviewLoading(true);
      setPreviewError("");
      setPreviewFile(file);
      setPreviewUrl("");

      const url = await getSessionFileUrl(file.id);

      setPreviewUrl(url);
    } catch (err) {
      console.error(
        "Failed to load file preview:",
        err
      );

      setPreviewError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to preview this file."
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewFile(null);
    setPreviewUrl("");
    setPreviewError("");
  };

  /* =======================================================
     START REVIEW
     files_uploaded → reviewing
  ======================================================= */

  const handleStartReview = async () => {
    if (!sessionData?.session_token) {
      setQuoteError("Print session token is missing.");
      return;
    }

    if (sessionData.status !== "files_uploaded") {
      setQuoteError(
        `Cannot start review from status ${sessionData.status}.`
      );
      return;
    }

    try {
      setQuoteLoading(true);
      setQuoteError("");
      setQuoteSuccess("");

      const response = await startSessionReview(
        sessionData.session_token
      );

      const updatedSession = response?.data;

      if (updatedSession) {
        setSessionData(updatedSession);
        setQuotedAmount(
          updatedSession?.quoted_amount || ""
        );
      }

      onUpdated?.();
    } catch (err) {
      console.error(
        "Failed to start print session review:",
        err
      );

      setQuoteError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to start session review."
      );
    } finally {
      setQuoteLoading(false);
    }
  };

  /* =======================================================
     SUBMIT QUOTATION
     reviewing → quote_ready
  ======================================================= */

  const handleSubmitQuote = async () => {
    const amount = Number(quotedAmount);

    if (!amount || amount <= 0) {
      setQuoteError(
        "Please enter a valid quotation amount."
      );
      return;
    }

    if (!sessionData?.session_token) {
      setQuoteError("Print session token is missing.");
      return;
    }

    if (sessionData.status !== "reviewing") {
      setQuoteError(
        `Cannot submit quotation from status ${sessionData.status}.`
      );
      return;
    }

    try {
      setQuoteLoading(true);
      setQuoteError("");
      setQuoteSuccess("");

      const response = await submitSessionQuote(
        sessionData.session_token,
        amount
      );

      const updatedSession = response?.data;

      if (updatedSession) {
        setSessionData(updatedSession);
        setQuotedAmount(
          updatedSession?.quoted_amount || amount
        );
      } else {
        setSessionData((prev) => ({
          ...prev,
          status: "quote_ready",
          quoted_amount: amount,
        }));
      }

      setQuoteSuccess(
        "Quotation sent successfully."
      );

      onUpdated?.();
    } catch (err) {
      console.error(
        "Failed to submit quotation:",
        err
      );

      setQuoteError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to submit quotation."
      );
    } finally {
      setQuoteLoading(false);
    }
  };

  /* =======================================================
     STATUS
  ======================================================= */

  if (!session) {
    return null;
  }

  const currentStatus = sessionData?.status;
  const currentStage = getReviewStage(currentStatus);
  const paid = isPaidStatus(currentStatus);

  const isFilesUploaded =
    currentStatus === "files_uploaded";

  const isReviewing =
    currentStatus === "reviewing";

  const isQuoteReady =
    currentStatus === "quote_ready";

  const isPaymentPending =
    currentStatus === "payment_pending";

  const isPaid = paid;

  const statusText = useMemo(
    () => formatStatus(currentStatus || "unknown"),
    [currentStatus]
  );

  const stageItems = [
    {
      number: 1,
      title: "Files",
      description: "Customer submission",
    },
    {
      number: 2,
      title: "Review",
      description: "Shop checks files",
    },
    {
      number: 3,
      title: "Quote",
      description: "Customer gets price",
    },
    {
      number: 4,
      title: "Payment",
      description: "Ready to print",
    },
  ];

  return createPortal(
    <div className="print-session-review-overlay">
      <div
        className={`print-session-review-modal ${
          paid
            ? "review-modal-paid"
            : "review-modal-unpaid"
        }`}
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="review-header">
          <div className="review-header-main">
            <span className="review-eyebrow">
              PRINT SESSION REVIEW
            </span>

            <div className="review-title-row">
              <div className="review-customer-avatar">
                <UserRound size={18} />
              </div>

              <div>
                <h2>
                  {sessionData?.customer_name ||
                    "Customer"}
                </h2>

                <p>
                  {sessionData?.customer_phone ||
                    "No phone provided"}
                </p>
              </div>
            </div>
          </div>

          <div className="review-header-actions">
            <div
              className={
                paid
                  ? "review-payment-badge paid"
                  : "review-payment-badge unpaid"
              }
            >
              {paid ? (
                <>
                  <CheckCircle2 size={12} />
                  Paid
                </>
              ) : (
                <>
                  <Clock3 size={12} />
                  Unpaid
                </>
              )}
            </div>

            <button
              type="button"
              className="review-close-btn"
              onClick={onClose}
              aria-label="Close review"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* =================================================
            STAGE TIMELINE
        ================================================= */}

        <div className="review-timeline-wrap">
          <div className="review-timeline">
            {stageItems.map((stage, index) => {
              const completed =
                stage.number < currentStage;

              const active =
                stage.number === currentStage;

              return (
                <div
                  key={stage.number}
                  className={`review-timeline-step ${
                    completed
                      ? "completed"
                      : ""
                  } ${
                    active
                      ? "active"
                      : ""
                  }`}
                >
                  <div className="review-timeline-node">
                    {completed ? (
                      <Check size={13} />
                    ) : (
                      stage.number
                    )}
                  </div>

                  <div className="review-timeline-copy">
                    <strong>
                      {stage.title}
                    </strong>

                    <span>
                      {stage.description}
                    </span>
                  </div>

                  {index < stageItems.length - 1 && (
                    <div className="review-timeline-line" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* =================================================
            MESSAGES
        ================================================= */}

        {error && (
          <div className="review-alert review-alert-error">
            {error}
          </div>
        )}

        {quoteError && (
          <div className="review-alert review-alert-error">
            {quoteError}
          </div>
        )}

        {quoteSuccess && (
          <div className="review-alert review-alert-success">
            {quoteSuccess}
          </div>
        )}

        {/* =================================================
            LOADING
        ================================================= */}

        {loading ? (
          <div className="review-loading">
            <div className="review-spinner" />
            <p>Loading session details...</p>
          </div>
        ) : (
          <>

            {/* CUSTOMER */}
            <section className="review-section">
              <div className="review-section-heading">
                <div className="review-section-number">
                  1
                </div>

                <div>
                  <h3>Customer Details</h3>
                  <p>
                    Information provided for this
                    print request.
                  </p>
                </div>
              </div>

              <div className="review-customer-grid">
                <div className="review-info-card">
                  <span>Name</span>
                  <strong>
                    {sessionData?.customer_name ||
                      "Not provided"}
                  </strong>
                </div>

                <div className="review-info-card">
                  <span>Phone</span>
                  <strong>
                    {sessionData?.customer_phone ||
                      "Not provided"}
                  </strong>
                </div>

                <div className="review-info-card">
                  <span>Current Stage</span>
                  <strong className="review-status">
                    {statusText}
                  </strong>
                </div>

                <div className="review-info-card">
                  <span>Created</span>
                  <strong>
                    {formatDate(
                      sessionData?.created_at
                    )}
                  </strong>
                </div>
              </div>
            </section>

            {/* FILES */}
            <section className="review-section">
              <div className="review-section-heading">
                <div className="review-section-number">
                  2
                </div>

                <div>
                  <h3>Uploaded Files</h3>
                  <p>
                    Documents submitted by the
                    customer.
                  </p>
                </div>

                <div className="review-section-count">
                  {files.length}{" "}
                  {files.length === 1
                    ? "file"
                    : "files"}
                </div>
              </div>

              {files.length === 0 ? (
                <div className="review-empty-files">
                  No files were uploaded for this
                  session.
                </div>
              ) : (
                <div className="review-file-list">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="review-file-item"
                    >
                      <div className="review-file-icon">
                        <FileText size={16} />
                      </div>

                      <div className="review-file-info">
                        <strong>
                          {file.file_name ||
                            file.original_filename ||
                            "Unnamed file"}
                        </strong>

                        <span>
                          {getFileExtension(
                            file.file_name ||
                              file.original_filename
                          )}

                          {" • "}

                          {formatFileSize(
                            file.file_size
                          )}

                          {file.mime_type &&
                            ` • ${file.mime_type}`}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="review-preview-btn"
                        onClick={() =>
                          handlePreview(file)
                        }
                      >
                        Preview
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* QUOTATION */}
            <section className="review-section quotation-section">
              <div className="review-section-heading">
                <div className="review-section-number">
                  3
                </div>

                <div>
                  <h3>Quotation & Payment</h3>
                  <p>
                    The customer cannot proceed to
                    printing until payment is confirmed.
                  </p>
                </div>
              </div>

              {/* FILES UPLOADED */}
              {isFilesUploaded && (
                <div className="review-action-card">
                  <div className="review-action-icon review-action-yellow">
                    <FileText size={18} />
                  </div>

                  <div className="review-action-copy">
                    <strong>
                      Ready for your review
                    </strong>

                    <p>
                      Check the uploaded files and
                      prepare the final quotation.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="review-primary-btn"
                    onClick={handleStartReview}
                    disabled={quoteLoading}
                  >
                    {quoteLoading
                      ? "Starting..."
                      : "Start Review"}
                  </button>
                </div>
              )}

              {/* REVIEWING */}
              {isReviewing && (
                <div className="quotation-form">
                  <div className="quotation-form-top">
                    <div>
                      <strong>
                        Set the final print price
                      </strong>

                      <p>
                        This is the amount the customer
                        will be asked to pay.
                      </p>
                    </div>
                  </div>

                  <label
                    htmlFor="quotedAmount"
                    className="quotation-label"
                  >
                    Final Amount
                  </label>

                  <div className="quotation-input-wrapper">
                    <IndianRupee size={15} />
                    <input
                      id="quotedAmount"
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="Enter amount"
                      value={quotedAmount}
                      onChange={(event) =>
                        setQuotedAmount(
                          event.target.value
                        )
                      }
                      disabled={quoteLoading}
                    />
                  </div>

                  <button
                    type="button"
                    className="quotation-submit-btn"
                    onClick={handleSubmitQuote}
                    disabled={
                      quoteLoading ||
                      !quotedAmount ||
                      Number(quotedAmount) <= 0
                    }
                  >
                    {quoteLoading
                      ? "Sending Quotation..."
                      : "Send Quotation"}
                  </button>
                </div>
              )}

              {/* QUOTE READY */}
              {isQuoteReady && (
                <div className="session-state-card session-state-quote">
                  <div className="session-state-icon">
                    <IndianRupee size={18} />
                  </div>

                  <div className="session-state-content">
                    <div className="session-state-top">
                      <strong>Quotation Sent</strong>

                      <span className="session-state-tag">
                        Awaiting payment
                      </span>
                    </div>

                    <p>
                      The customer has received the
                      quotation. Printing must wait
                      until payment is confirmed.
                    </p>

                    {sessionData?.quoted_amount && (
                      <div className="session-state-amount">
                        ₹
                        {Number(
                          sessionData.quoted_amount
                        ).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PAYMENT PENDING */}
              {isPaymentPending && (
                <div className="session-state-card session-state-quote">
                  <div className="session-state-icon">
                    <Clock3 size={18} />
                  </div>

                  <div className="session-state-content">
                    <div className="session-state-top">
                      <strong>
                        Waiting for Payment
                      </strong>

                      <span className="session-state-tag">
                        Unpaid
                      </span>
                    </div>

                    <p>
                      The quotation is ready. Wait
                      for the customer's payment before
                      starting the print job.
                    </p>

                    {sessionData?.quoted_amount && (
                      <div className="session-state-amount">
                        ₹
                        {Number(
                          sessionData.quoted_amount
                        ).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PAID / PRINTING / PICKUP / COMPLETED */}
              {isPaid && (
                <div className="session-state-card session-state-success">
                  <div className="session-state-icon">
                    <CheckCircle2 size={19} />
                  </div>

                  <div className="session-state-content">
                    <div className="session-state-top">
                      <strong>
                        {currentStatus === "paid"
                          ? "Payment Received"
                          : formatStatus(
                              currentStatus
                            )}
                      </strong>

                      <span className="session-state-tag">
                        Paid
                      </span>
                    </div>

                    <p>
                      Payment has been confirmed.
                      This session can now continue
                      through the printing workflow.
                    </p>

                    {sessionData?.quoted_amount && (
                      <div className="session-state-amount">
                        ₹
                        {Number(
                          sessionData.quoted_amount
                        ).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* EARLIER / UNKNOWN */}
              {!isFilesUploaded &&
                !isReviewing &&
                !isQuoteReady &&
                !isPaymentPending &&
                !isPaid && (
                  <div className="session-state-card session-state-neutral">
                    <div className="session-state-icon">
                      <Clock3 size={18} />
                    </div>

                    <div className="session-state-content">
                      <strong>Session Status</strong>

                      <p>
                        Current session status:{" "}
                        {statusText}
                      </p>
                    </div>
                  </div>
                )}
            </section>

            {/* NEXT STEP */}
            <section className="review-next-step">
              <span>NEXT STEP</span>

              {isFilesUploaded && (
                <>
                  <h3>
                    Review the files and prepare
                    the quotation
                  </h3>

                  <p>
                    Start the review when you are
                    ready to set the final amount.
                  </p>
                </>
              )}

              {isReviewing && (
                <>
                  <h3>Send the quotation</h3>

                  <p>
                    Enter the final print amount and
                    send it to the customer.
                  </p>
                </>
              )}

              {(isQuoteReady ||
                isPaymentPending) && (
                <>
                  <h3>
                    Wait for customer payment
                  </h3>

                  <p>
                    The session remains unpaid until
                    the payment is confirmed.
                  </p>
                </>
              )}

              {isPaid && (
                <>
                  <h3>Ready to continue printing</h3>

                  <p>
                    Payment is confirmed. The session
                    can now proceed through printing.
                  </p>
                </>
              )}
            </section>
          </>
        )}

        <footer className="review-footer">
          <button
            type="button"
            className="review-secondary-btn"
            onClick={onClose}
          >
            Close Review
          </button>
        </footer>
      </div>

      {/* ===================================================
          FILE PREVIEW
      =================================================== */}

      {previewFile && (
        <div className="file-preview-overlay">
          <div className="file-preview-modal">
            <div className="file-preview-header">
              <div>
                <strong>
                  {previewFile.file_name ||
                    previewFile.original_filename ||
                    "File Preview"}
                </strong>

                <span>
                  {previewFile.mime_type || ""}
                </span>
              </div>

              <button
                type="button"
                className="file-preview-close"
                onClick={closePreview}
                aria-label="Close preview"
              >
                <X size={17} />
              </button>
            </div>

            <div className="file-preview-content">
              {previewLoading && (
                <div className="review-loading">
                  <div className="review-spinner" />
                  <p>Loading preview...</p>
                </div>
              )}

              {!previewLoading && previewError && (
                <div className="preview-error">
                  {previewError}
                </div>
              )}

              {!previewLoading &&
                !previewError &&
                previewUrl &&
                previewFile.mime_type ===
                  "application/pdf" && (
                  <iframe
                    src={previewUrl}
                    title={
                      previewFile.file_name ||
                      previewFile.original_filename ||
                      "PDF Preview"
                    }
                  />
                )}

              {!previewLoading &&
                !previewError &&
                previewUrl &&
                previewFile.mime_type?.startsWith(
                  "image/"
                ) && (
                  <div className="image-preview-wrapper">
                    <img
                      src={previewUrl}
                      alt={
                        previewFile.file_name ||
                        previewFile.original_filename ||
                        "Preview"
                      }
                    />

                    <a
                      href={previewUrl}
                      download={
                        previewFile.file_name ||
                        previewFile.original_filename ||
                        "download"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="image-download-btn"
                    >
                      Download Image
                    </a>
                  </div>
                )}

              {!previewLoading &&
                !previewError &&
                previewUrl &&
                !previewFile.mime_type?.startsWith(
                  "image/"
                ) &&
                previewFile.mime_type !==
                  "application/pdf" && (
                  <div className="unsupported-preview">
                    <h3>Preview unavailable</h3>

                    <p>
                      This file type cannot be
                      previewed directly in the browser.
                    </p>

                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="review-download-btn"
                    >
                      Open File
                    </a>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>,
    document.getElementById("modal-root")
  );
};

export default PrintSessionReview;