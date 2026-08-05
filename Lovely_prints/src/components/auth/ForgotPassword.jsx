import { useState } from "react";
import { supabase } from "../../services/supabase";
import { Link } from "react-router-dom";
import { Mail, ArrowRight, ArrowLeft } from "lucide-react";
import "./f.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("If an account exists with this email, you'll receive a password reset link shortly.");
    }

    setLoading(false);
  };

  return (
    <div className="fp-root">
      <div className="fp-grid" />

      <div className="fp-center">
        <div className="fp-card">

          {/* Top branding */}
          <div className="fp-badge">ACCOUNT RECOVERY</div>

          <div className="fp-headline">
            <span className="fp-h-solid">Forgot</span>
            <span className="fp-h-green"> your</span>
            <br />
            <span className="fp-h-outline">Password?</span>
          </div>

          <p className="fp-sub">
            No worries. Enter your email and we'll send you a reset link instantly.
          </p>

          <div className={`fp-input-wrap${message ? " fp-input-disabled" : ""}`}>
            <Mail size={16} className="fp-input-icon" />
            <input
              className="fp-input"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!message}
            />
          </div>

          {error && <div className="fp-error">{error}</div>}

          {message && (
            <div className="fp-success">
              <span className="fp-success-dot">✓</span>
              {message}
            </div>
          )}

          {!message && (
            <button
              className={`fp-btn${loading ? " fp-btn-loading" : ""}`}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Sending..." : (
                <span className="fp-btn-inner">
                  Send Reset Link <ArrowRight size={16} />
                </span>
              )}
            </button>
          )}

          <div className="fp-back">
            <Link to="/login" className="fp-back-link">
              <ArrowLeft size={14} /> Back to Login
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}