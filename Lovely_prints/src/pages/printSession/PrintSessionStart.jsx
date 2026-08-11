import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { startPrintSession } from "../../services/printSessionService";
import "./printSessionStart.css";

const PrintSessionStart = () => {
  const { shopId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStartPrinting = async () => {
    if (!shopId || loading) return;

    try {
      setLoading(true);
      setError("");

      const response = await startPrintSession(shopId);

      const sessionToken =
        response?.data?.sessionToken;

      if (!sessionToken) {
        throw new Error(
          "Session token was not returned by the server."
        );
      }

      navigate(
        `/print-session/${sessionToken}`
      );

    } catch (error) {
      console.error(
        "Failed to start print session:",
        error
      );

      setError(
        error?.response?.data?.message ||
        error?.message ||
        "Unable to start a print session. Please try again."
      );

      setLoading(false);
    }
  };

  return (
    <div className="print-session-start-page">

      <div className="print-session-start-card">

        <div className="print-session-start-eyebrow">
          DOCUVIO PRINT SESSION
        </div>

        <h1>
          Ready to print?
        </h1>

        <p className="print-session-start-description">
          Start a print session with this shop.
          Upload your documents, review the quotation,
          and pay securely once the shop confirms the price.
        </p>

        <div className="print-session-start-steps">

          <div className="start-step">
            <span>1</span>
            <div>
              <strong>Upload</strong>
              <p>
                Send your documents to the shop.
              </p>
            </div>
          </div>

          <div className="start-step">
            <span>2</span>
            <div>
              <strong>Get a quotation</strong>
              <p>
                The shop reviews your files and sends
                the final price.
              </p>
            </div>
          </div>

          <div className="start-step">
            <span>3</span>
            <div>
              <strong>Pay & print</strong>
              <p>
                Pay securely and the shop starts printing.
              </p>
            </div>
          </div>

        </div>

        {error && (
          <div className="print-session-start-error">
            {error}
          </div>
        )}

        <button
          className="print-session-start-button"
          onClick={handleStartPrinting}
          disabled={loading}
        >
          {loading
            ? "Starting Print Session..."
            : "Start Printing"}
        </button>

        <p className="print-session-start-note">
          You will be taken directly to your private
          print session.
        </p>

      </div>

    </div>
  );
};

export default PrintSessionStart;