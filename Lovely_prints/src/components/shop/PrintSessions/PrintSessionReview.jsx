import { useEffect, useState } from "react";
import {
  getPrintSession,
  getSessionFiles,
    getSessionFileUrl,
} from "../../../services/printSessionService";
import "./printSessions.css";


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

const PrintSessionReview = ({
  session,
  onClose,
  onUpdated,
}) => {
  const [sessionData, setSessionData] = useState(session);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewFile, setPreviewFile] = useState(null);
const [previewUrl, setPreviewUrl] = useState("");
const [previewLoading, setPreviewLoading] = useState(false);
const [previewError, setPreviewError] = useState("");


const handlePreview = async (file) => {
  try {
    setPreviewLoading(true);
    setPreviewError("");
    setPreviewFile(file);
    setPreviewUrl("");

    const url = await getSessionFileUrl(file.id);

    setPreviewUrl(url);
  } catch (error) {
    console.error("Failed to load file preview:", error);

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

        const [sessionResponse, filesResponse] =
          await Promise.all([
            getPrintSession(session.session_token),
            getSessionFiles(session.session_token),
          ]);

        setSessionData(
          sessionResponse?.data || session
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

  if (!session) {
    return null;
  }

  return (
    <div className="print-session-review-overlay">
      <div className="print-session-review-modal">

        {/* ================= HEADER ================= */}

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
            className="review-close-btn"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* ================= ERROR ================= */}

        {error && (
          <div className="review-error">
            {error}
          </div>
        )}

        {/* ================= LOADING ================= */}

        {loading ? (
          <div className="review-loading">
            <div className="review-spinner" />
            <p>Loading session details...</p>
          </div>
        ) : (
          <>
            {/* ================= CUSTOMER ================= */}

            <section className="review-section">

              <div className="review-section-heading">
                <div className="review-section-number">
                  1
                </div>

                <div>
                  <h3>Customer Details</h3>
                  <p>
                    Information provided by the
                    customer.
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
                  <span>Status</span>
                  <strong className="review-status">
                    {sessionData?.status ||
                      "Unknown"}
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

            {/* ================= FILES ================= */}

            <section className="review-section">

              <div className="review-section-heading">
                <div className="review-section-number">
                  2
                </div>

                <div>
                  <h3>Uploaded Files</h3>
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
                            {formatFileSize(file.file_size)}

                            {file.mime_type &&
                            ` • ${file.mime_type}`}
                        </span>
                        </div>

                        <button
                        type="button"
                        className="review-preview-btn"
                        onClick={() => handlePreview(file)}
                        >
                        Preview
                        </button>

                    </div>
                  ))}

                </div>
              )}

            </section>

            {/* ================= NEXT STEP ================= */}

            <section className="review-next-step">

              <div>
                <span>
                  NEXT STEP
                </span>

                <h3>
                  Review the files and prepare
                  the quotation
                </h3>

                <p>
                  Quotation controls will be added
                  in the next step.
                </p>
              </div>

            </section>
          </>
        )}

        {/* ================= FOOTER ================= */}

        <div className="review-footer">
          <button
            className="review-secondary-btn"
            onClick={onClose}
          >
            Close
          </button>
        </div>

      </div>
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
          previewFile.mime_type === "application/pdf" && (
            <iframe
              src={previewUrl}
              title={
                previewFile.file_name ||
                previewFile.original_filename
              }
            />
          )}

        {!previewLoading &&
  !previewError &&
  previewUrl &&
  previewFile.mime_type?.startsWith("image/") && (
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

        {!previewLoading &&
          !previewError &&
          previewUrl &&
          !previewFile.mime_type?.startsWith("image/") &&
          previewFile.mime_type !== "application/pdf" && (
            <div className="unsupported-preview">
              <h3>Preview unavailable</h3>

              <p>
                This file type cannot be previewed
                directly in the browser.
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
    </div>
  );
};

export default PrintSessionReview;