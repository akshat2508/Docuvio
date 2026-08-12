import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Check, Download, FileText, LockKeyhole, Smartphone, UserRound } from "lucide-react";

import { startPrintSession } from "../../services/printSessionService";
import AndroidAppPopup from "../../components/common/AndroidAppPopup";
import LOGO from "../../assets/logo.png";

import "./printSessionStart.css";

const SESSION_STEPS = [
  {
    number: "01",
    title: "Upload",
    description: "Send your documents to the shop.",
    icon: FileText,
  },
  {
    number: "02",
    title: "Get a quote",
    description: "The shop reviews your files and confirms the price.",
    icon: Check,
  },
  {
    number: "03",
    title: "Pay & print",
    description: "Pay securely and the shop starts printing.",
    icon: LockKeyhole,
  },
];

const PrintSessionStart = () => {
  const { shopId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  /*
   * The print session remains available without an account.
   * The login/signup prompt is intentionally shown every time
   * this page is visited so students know what extra features
   * they unlock with an account.
   */
  useEffect(() => {
    setShowLoginPrompt(true);
  }, []);

  const handleStartPrinting = async () => {
    if (!shopId || loading) return;

    try {
      setLoading(true);
      setError("");

      const response = await startPrintSession(shopId);

      const sessionToken = response?.data?.sessionToken;

      if (!sessionToken) {
        throw new Error(
          "Session token was not returned by the server."
        );
      }

      navigate(`/print-session/${sessionToken}`);
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
      <AndroidAppPopup />

      <div className="start-grid-background" />

      <header className="print-session-start-nav">
        <a href="/" className="start-brand">
          <img src={LOGO} alt="Docuvio" />
          <span>Docuvio</span>
        </a>

        <div className="start-nav-actions">
          <a href="/login" className="start-nav-login">
            Log In
          </a>

          <a href="/signup" className="start-nav-register">
            Register <ArrowRight size={14} />
          </a>
        </div>
      </header>

      <main className="print-session-start-main">
        <section className="start-hero">
          <div className="start-hero-copy">
            <div className="start-eyebrow">
              <span className="start-eyebrow-dot" />
              CAMPUS PRINTING MARKETPLACE
            </div>

            <h1>
              Print
              <span> smarter.</span>
              <br />
              Move faster.
            </h1>

            <p className="start-hero-description">
              Your print request, handled from upload to
              payment — without waiting at the counter.
            </p>

          </div>

          <section className="print-session-start-card">
            <div className="start-card-top">
              <div>
                <span className="start-card-eyebrow">
                  DOCUVIO PRINT SESSION
                </span>

                <h2>Ready to print?</h2>

                <p>
                  Start a private print session with this
                  shop. You can continue without an account.
                </p>
              </div>

              <button
              className="print-session-start-button"
              onClick={handleStartPrinting}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="start-button-spinner" />
                  Starting Print Session...
                </>
              ) : (
                <>
                  Start Printing
                  <ArrowRight size={17} />
                </>
              )}
            </button>
            </div>

            <div className="start-workflow">
              <div className="start-workflow-heading">
                <span>HOW IT WORKS</span>
                <strong>Three simple steps</strong>
              </div>

              <div className="start-workflow-steps">
                {SESSION_STEPS.map((step, index) => {
                  const Icon = step.icon;

                  return (
                    <div
                      className="start-workflow-step"
                      key={step.number}
                    >
                      <div className="start-step-marker">
                        <Icon size={15} strokeWidth={2.2} />
                      </div>

                      <div className="start-step-content">
                        <span>{step.number}</span>
                        <strong>{step.title}</strong>
                        <p>{step.description}</p>
                      </div>

                      {index < SESSION_STEPS.length - 1 && (
                        <div className="start-step-line" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="start-account-note">
              <div className="start-account-icon">
                <UserRound size={16} />
              </div>

              <div>
                <strong>Want the full Docuvio experience?</strong>
                <p>
                  Create an account to unlock scheduled
                  pickups, order history, saved preferences,
                  and easier repeat orders.
                </p>
              </div>
            </div>

            {error && (
              <div className="print-session-start-error">
                {error}
              </div>
            )}

           

            <p className="print-session-start-note">
              No account required to start this print session.
            </p>
          </section>
        </section>

        <section className="start-bottom-strip">
          <div>
            <span>PRIVATE SESSION</span>
            <strong>Your documents stay tied to this session.</strong>
          </div>

          <div>
            <span>ACCOUNT BENEFITS</span>
            <strong>Schedule, track and repeat orders faster.</strong>
          </div>

          <a href="/signup" className="start-bottom-link">
            Create an account <ArrowRight size={14} />
          </a>
        </section>
      </main>

      {showLoginPrompt && (
        <div
          className="start-login-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowLoginPrompt(false);
            }
          }}
        >
          <div className="start-login-modal">
            <button
              type="button"
              className="start-login-close"
              onClick={() => setShowLoginPrompt(false)}
              aria-label="Close"
            >
              ×
            </button>

            <div className="start-login-modal-icon">
              <UserRound size={21} />
            </div>

            <span className="start-login-modal-eyebrow">
              BEFORE YOU START
            </span>

            <h2>
              Get more out of Docuvio.
            </h2>

            <p>
              You can print as a guest, but creating an
              account unlocks the features that make
              repeat printing much easier.
            </p>

            <div className="start-login-features">
              <div>
                <Check size={14} />
                Schedule pickup times
              </div>

              <div>
                <Check size={14} />
                Track your order history
              </div>

              <div>
                <Check size={14} />
                Save your print preferences
              </div>
            </div>

            <div className="start-login-modal-actions">
              <a href="/signup" className="start-modal-primary">
                Create Account
                <ArrowRight size={15} />
              </a>

              <a href="/login" className="start-modal-secondary">
                Log In
              </a>
            </div>

            <button
              type="button"
              className="start-continue-guest"
              onClick={() => setShowLoginPrompt(false)}
            >
              Continue without account
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrintSessionStart;