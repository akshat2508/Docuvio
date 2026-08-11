import { useEffect, useState } from "react";

import {
  getPrintSession,
  getSessionFiles,
  getSessionFileUrl,
  startSessionReview,
  submitSessionQuote,
} from "../../../services/printSessionService";

import "./printSessions.css";
import { createPortal } from "react-dom";

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

const formatStatus = (status = "") => {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
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

  /* =======================================================
     FILE PREVIEW
  ======================================================= */

  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  /* =======================================================
     QUOTATION
  ======================================================= */

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
          getPrintSession(
            session.session_token
          ),

          getSessionFiles(
            session.session_token
          ),
        ]);

        const updatedSession =
          sessionResponse?.data || session;

        setSessionData(updatedSession);

        setQuotedAmount(
          updatedSession?.quoted_amount || ""
        );

        setFiles(
          filesResponse?.data || []
        );
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

      const url = await getSessionFileUrl(
        file.id
      );

      setPreviewUrl(url);
    } catch (error) {
      console.error(
        "Failed to load file preview:",
        error
      );

      setPreviewError(
        error?.response?.data?.message ||
          error?.message ||
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
     
     ONLY VALID FROM:
     
     files_uploaded → reviewing
  ======================================================= */

  const handleStartReview = async () => {
    if (!sessionData?.session_token) {
      setQuoteError(
        "Print session token is missing."
      );

      return;
    }

    /*
     * Frontend safety check.
     *
     * The backend still remains the final authority.
     */

    if (
      sessionData.status !==
      "files_uploaded"
    ) {
      setQuoteError(
        `Cannot start review from status ${sessionData.status}.`
      );

      return;
    }

    try {
      setQuoteLoading(true);

      setQuoteError("");

      setQuoteSuccess("");

      const response =
        await startSessionReview(
          sessionData.session_token
        );

      const updatedSession =
        response?.data;

      if (updatedSession) {
        setSessionData(
          updatedSession
        );

        setQuotedAmount(
          updatedSession?.quoted_amount || ""
        );
      }

      onUpdated?.();
    } catch (error) {
      console.error(
        "Failed to start print session review:",
        error
      );

      setQuoteError(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to start session review."
      );
    } finally {
      setQuoteLoading(false);
    }
  };

  /* =======================================================
     SUBMIT QUOTATION
     
     ONLY VALID FROM:
     
     reviewing → quote_ready
  ======================================================= */

  const handleSubmitQuote = async () => {
    const amount = Number(
      quotedAmount
    );

    if (!amount || amount <= 0) {
      setQuoteError(
        "Please enter a valid quotation amount."
      );

      return;
    }

    if (!sessionData?.session_token) {
      setQuoteError(
        "Print session token is missing."
      );

      return;
    }

    /*
     * Frontend safety check.
     */

    if (
      sessionData.status !==
      "reviewing"
    ) {
      setQuoteError(
        `Cannot submit quotation from status ${sessionData.status}.`
      );

      return;
    }

    try {
      setQuoteLoading(true);

      setQuoteError("");

      setQuoteSuccess("");

      const response =
        await submitSessionQuote(
          sessionData.session_token,
          amount
        );

      const updatedSession =
        response?.data;

      if (updatedSession) {
        setSessionData(
          updatedSession
        );

        setQuotedAmount(
          updatedSession?.quoted_amount ||
            amount
        );
      } else {
        /*
         * Fallback in case backend doesn't
         * return the updated session.
         */

        setSessionData(
          (prev) => ({
            ...prev,

            status:
              "quote_ready",

            quoted_amount:
              amount,
          })
        );
      }

      setQuoteSuccess(
        "Quotation sent successfully."
      );

      onUpdated?.();
    } catch (error) {
      console.error(
        "Failed to submit quotation:",
        error
      );

      setQuoteError(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to submit quotation."
      );
    } finally {
      setQuoteLoading(false);
    }
  };

  /* =======================================================
     NULL SESSION
  ======================================================= */

  if (!session) {
    return null;
  }

  /* =======================================================
     CURRENT STATUS
  ======================================================= */

  const currentStatus =
    sessionData?.status;

  const isFilesUploaded =
    currentStatus ===
    "files_uploaded";

  const isReviewing =
    currentStatus ===
    "reviewing";

  const isQuoteReady =
    currentStatus ===
    "quote_ready";

  const isPaymentPending =
    currentStatus ===
    "payment_pending";

  const isPaid =
    currentStatus ===
    "paid";

  /* =======================================================
     RENDER
  ======================================================= */

  return createPortal(
    <div className="print-session-review-overlay">

      <div className="print-session-review-modal">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="review-header">

          <div>

            <span className="review-eyebrow">
              PRINT SESSION REVIEW
            </span>

            <h2>
              {sessionData?.customer_name ||
                "Customer"}
            </h2>

            <p>
              Review the customer's files before
              preparing the final quotation.
            </p>

          </div>

          <button
            type="button"
            className="review-close-btn"
            onClick={onClose}
          >
            ×
          </button>

        </div>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="review-error">
            {error}
          </div>
        )}

        {quoteError && (
          <div className="review-error">
            {quoteError}
          </div>
        )}

        {quoteSuccess && (
          <div className="review-success">
            {quoteSuccess}
          </div>
        )}

        {/* =================================================
            LOADING
        ================================================= */}

        {loading ? (

          <div className="review-loading">

            <div className="review-spinner" />

            <p>
              Loading session details...
            </p>

          </div>

        ) : (

          <>

            {/* =============================================
                CUSTOMER DETAILS
            ============================================= */}

            <section className="review-section">

              <div className="review-section-heading">

                <div className="review-section-number">
                  1
                </div>

                <div>

                  <h3>
                    Customer Details
                  </h3>

                  <p>
                    Information provided by the
                    customer.
                  </p>

                </div>

              </div>

              <div className="review-customer-grid">

                <div className="review-info-card">

                  <span>
                    Name
                  </span>

                  <strong>
                    {sessionData?.customer_name ||
                      "Not provided"}
                  </strong>

                </div>

                <div className="review-info-card">

                  <span>
                    Phone
                  </span>

                  <strong>
                    {sessionData?.customer_phone ||
                      "Not provided"}
                  </strong>

                </div>

                <div className="review-info-card">

                  <span>
                    Status
                  </span>

                  <strong className="review-status">

                    {formatStatus(
                      sessionData?.status ||
                        "unknown"
                    )}

                  </strong>

                </div>

                <div className="review-info-card">

                  <span>
                    Created
                  </span>

                  <strong>
                    {formatDate(
                      sessionData?.created_at
                    )}
                  </strong>

                </div>

              </div>

            </section>

            {/* =============================================
                FILES
            ============================================= */}

            <section className="review-section">

              <div className="review-section-heading">

                <div className="review-section-number">
                  2
                </div>

                <div>

                  <h3>
                    Uploaded Files
                  </h3>

                  <p>
                    Documents submitted by the
                    customer for printing.
                  </p>

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

                        {getFileExtension(
                          file.file_name ||
                            file.original_filename
                        )}

                      </div>

                      <div className="review-file-info">

                        <strong>

                          {file.file_name ||
                            file.original_filename ||
                            "Unnamed file"}

                        </strong>

                        <span>

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

            {/* =============================================
                QUOTATION
            ============================================= */}

            <section className="review-section quotation-section">

              <div className="review-section-heading">

                <div className="review-section-number">
                  3
                </div>

                <div>

                  <h3>
                    Print Quotation
                  </h3>

                  <p>
                    Prepare and send the final amount
                    to the customer.
                  </p>

                </div>

              </div>

              {/* =========================================
                  FILES UPLOADED
                  
                  START REVIEW
              ========================================= */}

              {isFilesUploaded && (

                <div className="quotation-start-card">

                  <div>

                    <strong>
                      Ready to review this session?
                    </strong>

                    <p>
                      Review the customer's files and
                      prepare the final quotation.
                    </p>

                  </div>

                  <button
                    type="button"
                    className="review-primary-btn"
                    onClick={
                      handleStartReview
                    }
                    disabled={
                      quoteLoading
                    }
                  >

                    {quoteLoading
                      ? "Starting Review..."
                      : "Start Review"}

                  </button>

                </div>

              )}

              {/* =========================================
                  REVIEWING
                  
                  ENTER QUOTATION
              ========================================= */}

              {isReviewing && (

                <div className="quotation-form">

                  <div className="quotation-amount-field">

                    <label htmlFor="quotedAmount">
                      Final Amount
                    </label>

                    <div className="quotation-input-wrapper">

                      <span>
                        ₹
                      </span>

                      <input
                        id="quotedAmount"
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="Enter amount"
                        value={quotedAmount}
                        onChange={(e) =>
                          setQuotedAmount(
                            e.target.value
                          )
                        }
                        disabled={
                          quoteLoading
                        }
                      />

                    </div>

                  </div>

                  <p className="quotation-help">

                    This will be the final amount the
                    customer needs to pay.

                  </p>

                  <button
                    type="button"
                    className="quotation-submit-btn"
                    onClick={
                      handleSubmitQuote
                    }
                    disabled={
                      quoteLoading ||
                      !quotedAmount ||
                      Number(
                        quotedAmount
                      ) <= 0
                    }
                  >

                    {quoteLoading
                      ? "Sending Quotation..."
                      : "Send Quotation"}

                  </button>

                </div>

              )}

              {/* =========================================
                  QUOTE READY
                  
                  CUSTOMER HAS RECEIVED QUOTE
              ========================================= */}

              {isQuoteReady && (

                <div className="session-state-card session-state-info">

                  <div className="session-state-icon">
                    ₹
                  </div>

                  <div className="session-state-content">

                    <strong>
                      Quotation Sent
                    </strong>

                    <p>
                      The quotation has been sent to
                      the customer. Waiting for the
                      customer to complete payment.
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

              {/* =========================================
                  PAYMENT PENDING
              ========================================= */}

              {isPaymentPending && (

                <div className="session-state-card session-state-info">

                  <div className="session-state-icon">
                    ₹
                  </div>

                  <div className="session-state-content">

                    <strong>
                      Waiting for Payment
                    </strong>

                    <p>
                      The customer has received the
                      quotation and needs to complete
                      payment.
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

              {/* =========================================
                  PAID
                  
                  READY TO PRINT
              ========================================= */}

              {isPaid && (

                <div className="session-state-card session-state-success">

                  <div className="session-state-icon">
                    ✓
                  </div>

                  <div className="session-state-content">

                    <strong>
                      Payment Received
                    </strong>

                    <p>
                      The customer has completed
                      payment. This print session is
                      ready for processing.
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

              {/* =========================================
                  UNKNOWN / EARLIER STATES
              ========================================= */}

              {!isFilesUploaded &&
                !isReviewing &&
                !isQuoteReady &&
                !isPaymentPending &&
                !isPaid && (

                  <div className="session-state-card session-state-info">

                    <div className="session-state-content">

                      <strong>
                        Session Status
                      </strong>

                      <p>
                        Current session status:
                        {" "}
                        {formatStatus(
                          currentStatus ||
                            "unknown"
                        )}
                      </p>

                    </div>

                  </div>

                )}

            </section>

            {/* =============================================
                NEXT STEP
            ============================================= */}

            <section className="review-next-step">

              <div>

                <span>
                  NEXT STEP
                </span>

                {isFilesUploaded && (

                  <>
                    <h3>
                      Review the files and prepare
                      the quotation
                    </h3>

                    <p>
                      Start the review when you are
                      ready to prepare the customer's
                      final amount.
                    </p>
                  </>

                )}

                {isReviewing && (

                  <>
                    <h3>
                      Send the quotation
                    </h3>

                    <p>
                      Enter the final print amount and
                      send it to the customer.
                    </p>
                  </>

                )}

                {isQuoteReady && (

                  <>
                    <h3>
                      Waiting for customer payment
                    </h3>

                    <p>
                      The quotation has been sent.
                      The customer must complete payment
                      before printing.
                    </p>
                  </>

                )}

                {isPaymentPending && (

                  <>
                    <h3>
                      Waiting for customer payment
                    </h3>

                    <p>
                      Payment is still pending.
                      Printing should not begin yet.
                    </p>
                  </>

                )}

                {isPaid && (

                  <>
                    <h3>
                      Ready to print
                    </h3>

                    <p>
                      Payment has been confirmed.
                      You can now process this print
                      request.
                    </p>
                  </>

                )}

              </div>

            </section>

          </>

        )}

        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="review-footer">

          <button
            type="button"
            className="review-secondary-btn"
            onClick={onClose}
          >
            Close
          </button>

        </div>

      </div>

      {/* ===================================================
          FILE PREVIEW MODAL
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
              >
                ×
              </button>

            </div>

            <div className="file-preview-content">

              {/* LOADING */}

              {previewLoading && (

                <div className="review-loading">

                  <div className="review-spinner" />

                  <p>
                    Loading preview...
                  </p>

                </div>

              )}

              {/* ERROR */}

              {!previewLoading &&
                previewError && (

                  <div className="preview-error">

                    {previewError}

                  </div>

                )}

              {/* PDF */}

              {!previewLoading &&
                !previewError &&
                previewUrl &&
                previewFile.mime_type ===
                  "application/pdf" && (

                  <iframe
                    src={previewUrl}
                    title={
                      previewFile.file_name ||
                      previewFile.original_filename
                    }
                  />

                )}

              {/* IMAGE */}

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
                        previewFile.original_filename
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

              {/* OTHER FILE TYPES */}

              {!previewLoading &&
                !previewError &&
                previewUrl &&
                !previewFile.mime_type?.startsWith(
                  "image/"
                ) &&
                previewFile.mime_type !==
                  "application/pdf" && (

                  <div className="unsupported-preview">

                    <h3>
                      Preview unavailable
                    </h3>

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

    </div>,document.getElementById("modal-root")
  );
};

export default PrintSessionReview;