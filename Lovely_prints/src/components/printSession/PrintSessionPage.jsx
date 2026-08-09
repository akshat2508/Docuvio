import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import {
  getPrintSession,
  submitCustomerDetails,
  startFileUpload,
  uploadSessionFile,
  getSessionFiles,
  getSessionFileUrl,
} from "../../services/printSessionService";

import "./printSession.css";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
];

const STATUS_LABELS = {
  created: "Connecting",
  connected: "Connected",
  customer_details: "Customer Details",
  files_uploading: "Upload Files",
  files_uploaded: "Files Uploaded",
  reviewing: "Reviewing",
  quote_ready: "Quote Ready",
  payment_pending: "Payment Pending",
  paid: "Paid",
  printing: "Printing",
  ready_for_pickup: "Ready for Pickup",
  completed: "Completed",
  expired: "Session Expired",
};

const PrintSessionPage = () => {
  const { sessionToken } = useParams();
  const navigate = useNavigate();

  const fileInputRef = useRef(null);

  const [session, setSession] = useState(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [files, setFiles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submittingCustomer, setSubmittingCustomer] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [previewUrl, setPreviewUrl] = useState("");
  const [previewFile, setPreviewFile] = useState(null);

  const status = session?.status;

  const isExpired = status === "expired";

  const canSubmitCustomer =
    customerName.trim().length >= 2 &&
    /^[0-9]{10}$/.test(customerPhone.trim()) &&
    !submittingCustomer;

  const canUpload =
    ["files_uploading", "files_uploaded"].includes(status) &&
    !uploading &&
    !isExpired;

  const statusLabel = useMemo(() => {
    return STATUS_LABELS[status] || status || "Loading";
  }, [status]);

  // ==========================================
  // LOAD SESSION
  // ==========================================

  const loadSession = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getPrintSession(sessionToken);

      if (!response?.success) {
        throw new Error(
          response?.message || "Unable to load print session"
        );
      }

      setSession(response.data);
    } catch (err) {
      console.error("Failed to load print session:", err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to load this print session."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // LOAD FILES
  // ==========================================

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

  useEffect(() => {
    if (!sessionToken) {
      setError("Invalid print session.");
      setLoading(false);
      return;
    }

    loadSession();
  }, [sessionToken]);

  useEffect(() => {
    if (
      status === "files_uploading" ||
      status === "files_uploaded" ||
      status === "reviewing"
    ) {
      loadFiles();
    }
  }, [status]);

  // ==========================================
  // CUSTOMER DETAILS
  // ==========================================

  const handleCustomerSubmit = async (e) => {
    e.preventDefault();

    if (!canSubmitCustomer) return;

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
          response?.message || "Unable to save customer details"
        );
      }

      setSession(response.data);

      setSuccessMessage("Customer details saved.");

    } catch (err) {
      console.error("Customer details error:", err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to save customer details."
      );
    } finally {
      setSubmittingCustomer(false);
    }
  };

  // ==========================================
  // START FILE UPLOAD
  // ==========================================

  const handleStartUpload = async () => {
    try {
      setError("");
      setSuccessMessage("");

      const response = await startFileUpload(sessionToken);

      if (!response?.success) {
        throw new Error(
          response?.message || "Unable to start file upload"
        );
      }

      setSession(response.data);

    } catch (err) {
      console.error("Start upload error:", err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to start file upload."
      );
    }
  };

  // ==========================================
  // FILE VALIDATION
  // ==========================================

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

  // ==========================================
  // UPLOAD FILE
  // ==========================================

  const handleFileSelection = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);

    if (!selectedFiles.length) return;

    setError("");
    setSuccessMessage("");

    try {
      setUploading(true);

      // Make sure the session is in files_uploading.
      if (session?.status === "customer_details") {
        const response = await startFileUpload(sessionToken);

        if (!response?.success) {
          throw new Error(
            response?.message || "Unable to start file upload"
          );
        }

        setSession(response.data);
      }

      for (const file of selectedFiles) {
        const validationError = validateFile(file);

        if (validationError) {
          throw new Error(validationError);
        }

        await uploadSessionFile(sessionToken, file);
      }

      await loadFiles();
      await loadSession();

      setSuccessMessage(
        selectedFiles.length === 1
          ? "File uploaded successfully."
          : `${selectedFiles.length} files uploaded successfully.`
      );
    } catch (err) {
      console.error("File upload error:", err);

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

  // ==========================================
  // PREVIEW
  // ==========================================

  const handlePreview = async (file) => {
    try {
      setError("");

      const url = await getSessionFileUrl(file.id);

      setPreviewUrl(url);
      setPreviewFile(file);
    } catch (err) {
      console.error("Preview error:", err);

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

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div className="print-session-page">
        <div className="session-card session-loading">
          <div className="session-spinner" />
          <p>Loading print session...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // ERROR WITHOUT SESSION
  // ==========================================

  if (!session) {
    return (
      <div className="print-session-page">
        <div className="session-card session-error-card">
          <div className="session-error-icon">!</div>

          <h2>Unable to open session</h2>

          <p>{error || "Print session could not be loaded."}</p>

          <button
            className="session-primary-btn"
            onClick={() => navigate("/student")}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="print-session-page">
        <div className="print-session-container">

          {/* ==========================================
              HEADER
          ========================================== */}

          <header className="session-header">
            <div>
              <span className="session-eyebrow">
                PRINT SESSION
              </span>

              <h1>
                {session.shop?.shop_name ||
                  session.shop_name ||
                  "Print Shop"}
              </h1>

              <p>
                Upload your documents and continue with
                the printing process.
              </p>
            </div>

            <div className="session-status">
              <span className="status-dot" />
              {statusLabel}
            </div>
          </header>

          {/* ==========================================
              MESSAGES
          ========================================== */}

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

          {/* ==========================================
              SESSION EXPIRED
          ========================================== */}

          {isExpired && (
            <section className="session-card session-expired">
              <h2>Session Expired</h2>

              <p>
                This print session is no longer active.
                Please scan the shop QR code again to
                start a new session.
              </p>
            </section>
          )}

          {/* ==========================================
              CUSTOMER DETAILS
          ========================================== */}

          {!isExpired &&
            ["created", "connected", "customer_details"].includes(
              status
            ) && (
              <section className="session-card">

                <div className="section-heading">
                  <div className="section-number">1</div>

                  <div>
                    <h2>Customer Details</h2>
                    <p>
                      Enter your details before uploading
                      your documents.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleCustomerSubmit}>
                  <div className="session-form-grid">

                    <div className="session-field">
                      <label>Full Name</label>

                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) =>
                          setCustomerName(e.target.value)
                        }
                        placeholder="Enter your name"
                        disabled={
                          submittingCustomer ||
                          status !== "connected"
                        }
                      />
                    </div>

                    <div className="session-field">
                      <label>Mobile Number</label>

                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) =>
                          setCustomerPhone(
                            e.target.value.replace(/\D/g, "")
                          )
                        }
                        placeholder="10-digit mobile number"
                        maxLength={10}
                        disabled={
                          submittingCustomer ||
                          status !== "connected"
                        }
                      />
                    </div>

                  </div>

                  {status === "connected" && (
                    <button
                      type="submit"
                      className="session-primary-btn"
                      disabled={!canSubmitCustomer}
                    >
                      {submittingCustomer
                        ? "Saving..."
                        : "Continue"}
                    </button>
                  )}

                  {status === "customer_details" && (
                    <div className="completed-step">
                      <span>✓</span>
                      Customer details saved
                    </div>
                  )}
                </form>
              </section>
            )}

          {/* ==========================================
              FILE UPLOAD
          ========================================== */}

          {!isExpired &&
            [
              "customer_details",
              "files_uploading",
              "files_uploaded",
              "reviewing",
            ].includes(status) && (
              <section className="session-card">

                <div className="section-heading">
                  <div className="section-number">2</div>

                  <div>
                    <h2>Upload Documents</h2>

                    <p>
                      Upload the files you want the shop
                      to print.
                    </p>
                  </div>
                </div>

                {status === "customer_details" && (
                  <div className="upload-start-state">
                    <p>
                      Your details are saved. Start
                      uploading your documents.
                    </p>

                    <button
                      className="session-primary-btn"
                      onClick={handleStartUpload}
                    >
                      Start File Upload
                    </button>
                  </div>
                )}

                {(status === "files_uploading" ||
                  status === "files_uploaded" ||
                  status === "reviewing") && (
                  <>
                    <div
                      className={`session-upload-box ${
                        uploading
                          ? "uploading"
                          : ""
                      }`}
                      onClick={() =>
                        !uploading &&
                        fileInputRef.current?.click()
                      }
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        hidden
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={handleFileSelection}
                        disabled={uploading}
                      />

                      <div className="upload-icon">
                        ↑
                      </div>

                      <h3>
                        {uploading
                          ? "Uploading..."
                          : "Choose documents"}
                      </h3>

                      <p>
                        PDF, DOC, DOCX, JPG or PNG
                      </p>

                      <span>
                        Maximum 10MB per file
                      </span>
                    </div>

                    {/* FILE LIST */}

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

                      {files.length === 0 && (
                        <div className="empty-files">
                          <p>
                            No files uploaded yet.
                          </p>
                        </div>
                      )}

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
                                  Uploaded successfully
                                </span>
                              </div>
                            </div>

                            <button
                              className="file-preview-btn"
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
                  </>
                )}
              </section>
            )}

          {/* ==========================================
              NEXT STEP
          ========================================== */}

          {status === "files_uploaded" && (
            <section className="session-card next-step-card">

              <div>
                <span className="next-step-label">
                  NEXT STEP
                </span>

                <h2>
                  Review your documents
                </h2>

                <p>
                  Your files are uploaded. Continue to
                  review them before receiving the shop
                  quotation.
                </p>
              </div>

              <button
                className="session-primary-btn"
                disabled
              >
                Continue to Review
              </button>

              <small>
                Review step will be enabled in Phase 2C.
              </small>

            </section>
          )}

        </div>
      </div>

      {/* ==========================================
          PREVIEW MODAL
      ========================================== */}

      {previewUrl && previewFile && (
        <div
          className="session-preview-overlay"
          onClick={closePreview}
        >
          <div
            className="session-preview-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="preview-header">
              <div>
                <strong>
                  {previewFile.file_name}
                </strong>
              </div>

              <button
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
                    className="session-primary-btn"
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