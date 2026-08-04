import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import api from "../../services/api"
import { supabaseInvite } from "../../services/supabaseInvite";

import "./resetPassword.css";

export default function AcceptInvite() {
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabaseInvite.auth.getSession();

      if (!data.session) {
        setError("Invitation session not found.");
        return;
      }

      setSession(data.session);
      setSessionReady(true);
    };

    loadSession();
  }, []);

  const handleActivate = async () => {
    if (!sessionReady) return;

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    const { error } = await supabaseInvite.auth.updateUser({
      password,
    });
    const session = await supabaseInvite.auth.getSession();
    console.log("invite Session: ", session.data.session)
    await api.post(
    "/shops/activate",
    {},
    {
        headers: {
        Authorization: `Bearer ${session.data.session.access_token}`,
        },
    }
    );

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

   await supabaseInvite.auth.signOut();

alert("Shop activated successfully!");

navigate("/login");
  };

  return (
    <div className="auth-page-F">
      <div className="auth-card-F">

        <h2 className="auth-title-F">
          Activate Shop
        </h2>

        {session && (
          <>
            <p className="auth-info-F">
              Welcome to Docuvio
            </p>

            <p className="auth-info-F">
              <strong>{session.user.user_metadata.shop_name}</strong>
            </p>

            <p className="auth-info-F">
              {session.user.email}
            </p>
          </>
        )}

        <div className="password-field-F">
          <input
            type={showPassword ? "text" : "password"}
            className="auth-input-F"
            placeholder="Create Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={!sessionReady}
          />

          <button
            className="eye-toggle-F"
            type="button"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <Eye /> : <EyeOff />}
          </button>
        </div>

        <div className="password-field-F">
          <input
            type={showPassword ? "text" : "password"}
            className="auth-input-F"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={!sessionReady}
          />

          <button
            className="eye-toggle-F"
            type="button"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <Eye /> : <EyeOff />}
          </button>
        </div>

        {error && (
          <p className="auth-error-F">{error}</p>
        )}

        <button
          className="auth-btn-F"
          disabled={loading || !sessionReady}
          onClick={handleActivate}
        >
          {loading ? "Activating..." : "Activate Shop"}
        </button>

      </div>
    </div>
  );
}