import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Clock3,
  FileText,
  MessageSquareQuote,
  RefreshCw,
  Search,
  Users,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  X,
} from "lucide-react";
import { getShopPrintSessions } from "../../../services/printSessionService";
import PrintSessionCard from "./PrintSessionCard";
import PrintSessionReview from "./PrintSessionReview";
import { supabase } from "../../../services/supabase";
import "./printSessions.css";

const STATUS_META = {
  created: { label: "Connecting", tone: "neutral" },
  connected: { label: "Connected", tone: "neutral" },
  customer_details: { label: "Customer Details", tone: "neutral" },
  files_uploading: { label: "Uploading Files", tone: "blue" },
  files_uploaded: { label: "Files Received", tone: "blue" },
  reviewing: { label: "Reviewing", tone: "yellow" },
  quote_ready: { label: "Quote Sent", tone: "yellow" },
  payment_pending: { label: "Awaiting Payment", tone: "red" },
  paid: { label: "Paid", tone: "green" },
  printing: { label: "Printing", tone: "green" },
  ready_for_pickup: { label: "Ready for Pickup", tone: "green" },
  completed: { label: "Completed", tone: "green" },
  expired: { label: "Expired", tone: "red" },
};
const FILTERS = [
  { id: "all", label: "All" },
  { id: "action", label: "Needs Action" },
  { id: "unpaid", label: "Unpaid" },
  { id: "paid", label: "Paid" },
];
const getMeta = (s) =>
  STATUS_META[s] || { label: s || "Unknown", tone: "neutral" };
const isPaid = (s) =>
  ["paid", "printing", "ready_for_pickup", "completed"].includes(s);
const needsAction = (s) =>
  ["files_uploaded", "reviewing", "payment_pending"].includes(s);

const PrintSessionsPage = () => {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");

  const fetchSessions = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      else setRefreshing(true);
      const res = await getShopPrintSessions();
      if (res?.success) {
        const next = res.data || [];
        setSessions(next);
        setSelectedSession((current) => {
          if (!current) return null;
          return next.find((s) => s.id === current.id) || current;
        });
      }
    } catch (error) {
      console.error("Failed to fetch print sessions", error);
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions(true);
  }, [fetchSessions]);

  useEffect(() => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
      console.warn("Print Sessions realtime: access token missing");
      return;
    }
    supabase.realtime.setAuth(accessToken);
    const channel = supabase
      .channel("shop-print-sessions-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "print_sessions" },
        () => fetchSessions(false),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "print_sessions" },
        () => fetchSessions(false),
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "print_sessions" },
        () => fetchSessions(false),
      )
      .subscribe((status) =>
        console.log("Print Sessions realtime status:", status),
      );
    return () => supabase.removeChannel(channel);
  }, [fetchSessions]);

  const summary = useMemo(
    () => ({
      total: sessions.length,
      unpaid: sessions.filter((s) => !isPaid(s.status)).length,
      paid: sessions.filter((s) => isPaid(s.status)).length,
      action: sessions.filter((s) => needsAction(s.status)).length,
      quoted: sessions.filter((s) => s.status === "quote_ready").length,
    }),
    [sessions],
  );

  const filteredSessions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sessions.filter((session) => {
      const status = session.status;
      const matches =
        activeFilter === "action"
          ? needsAction(status)
          : activeFilter === "unpaid"
            ? !isPaid(status)
            : activeFilter === "paid"
              ? isPaid(status)
              : true;
      if (!matches) return false;
      if (!q) return true;
      return [
        session.customer_name,
        session.customer_phone,
        session.id,
        session.session_token,
        getMeta(status).label,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [sessions, activeFilter, search]);

  if (loading)
    return (
      <div className="print-sessions-page">
        <div className="print-sessions-shell">
          <div className="print-sessions-loading">
            <div className="print-sessions-loading-icon">
              <RefreshCw size={19} />
            </div>
            <div>
              <strong>Loading print sessions</strong>
              <span>Getting the latest customer requests...</span>
            </div>
          </div>
        </div>
      </div>
    );

  return (
    <div className="print-sessions-page">
      <div className="print-sessions-shell">
        <header className="print-sessions-header">
         
          <button
            className="print-sessions-refresh"
            onClick={() => fetchSessions(false)}
            disabled={refreshing}
          >
            <RefreshCw
              size={15}
              className={refreshing ? "print-sessions-refresh-spin" : ""}
            />
            Refresh
          </button>
        </header>

        <section className="print-sessions-summary">
          <div className="summary-card summary-card-main">
            <div className="summary-icon">
              <Users size={18} />
            </div>
            <div>
              <span>Active sessions</span>
              <strong>{summary.total}</strong>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon summary-icon-action">
              <AlertCircle size={18} />
            </div>
            <div>
              <span>Needs action</span>
              <strong>{summary.action}</strong>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon summary-icon-quote">
              <MessageSquareQuote size={18} />
            </div>
            <div>
              <span>Quote sent</span>
              <strong>{summary.quoted}</strong>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon summary-icon-paid">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <span>Paid</span>
              <strong>{summary.paid}</strong>
            </div>
          </div>
        </section>

        <section className="print-sessions-toolbar">
          <div className="print-sessions-filters">
            {FILTERS.map((filter) => (
              <button
                key={filter.id}
                className={
                  activeFilter === filter.id
                    ? "session-filter active"
                    : "session-filter"
                }
                onClick={() => setActiveFilter(filter.id)}
              >
                {filter.label}
                {filter.id === "action" && summary.action > 0 && (
                  <span>{summary.action}</span>
                )}
                {filter.id === "unpaid" && summary.unpaid > 0 && (
                  <span>{summary.unpaid}</span>
                )}
                {filter.id === "paid" && summary.paid > 0 && (
                  <span>{summary.paid}</span>
                )}
              </button>
            ))}
          </div>
          <div className="print-sessions-search">
            <Search size={15} />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer or session..."
            />
            {search && (
              <button onClick={() => setSearch("")} aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </div>
        </section>

        <div className="print-sessions-legend">
          <span className="legend-title">Session stage</span>
          <span>
            <i className="legend-dot legend-files" />
            Files
          </span>
          <span>
            <i className="legend-dot legend-review" />
            Review / Quote
          </span>
          <span>
            <i className="legend-dot legend-payment" />
            Awaiting Payment
          </span>
          <span>
            <i className="legend-dot legend-paid" />
            Paid / Printing
          </span>
          <span className="legend-payment-rule">
            <i />
            Red border = unpaid
          </span>
          <span className="legend-payment-rule">
            <i className="paid" />
            Green border = paid
          </span>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="empty-sessions">
            <div className="empty-sessions-icon">
              <FileText size={21} />
            </div>
            <h3>
              {sessions.length === 0
                ? "No active print sessions"
                : "No sessions match this filter"}
            </h3>
            <p>
              {sessions.length === 0
                ? "Customer sessions will appear here when they connect to your shop."
                : "Try another filter or clear the search to see more sessions."}
            </p>
            {(search || activeFilter !== "all") && (
              <button
                className="empty-sessions-button"
                onClick={() => {
                  setSearch("");
                  setActiveFilter("all");
                }}
              >
                Show all sessions
              </button>
            )}
          </div>
        ) : (
          <div className="print-session-list">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                className={`print-session-card-shell ${isPaid(session.status) ? "session-paid" : "session-unpaid"}`}
              >
                <div className="session-stage-strip">
                  <span
                    className={`stage-pill stage-${getMeta(session.status).tone}`}
                  >
                    {getMeta(session.status).label}
                  </span>
                  {session.status === "quote_ready" && (
                    <span className="quote-sent-label">Quotation sent</span>
                  )}
                  {isPaid(session.status) ? (
                    <span className="payment-state payment-state-paid">
                      <CheckCircle2 size={12} />
                      Paid
                    </span>
                  ) : (
                    <span className="payment-state payment-state-unpaid">
                      <Clock3 size={12} />
                      Unpaid
                    </span>
                  )}
                </div>
                <PrintSessionCard
                  session={session}
                  onOpen={() => setSelectedSession(session)}
                />
                <button
                  className="session-review-link"
                  onClick={() => setSelectedSession(session)}
                >
                  Open session review
                  <ChevronRight size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="print-sessions-footer-note">
          <span className="live-dot" />
          Live updates enabled<span className="footer-separator">•</span>
          {filteredSessions.length} session
          {filteredSessions.length === 1 ? "" : "s"} shown
        </div>
      </div>
      {selectedSession && (
        <PrintSessionReview
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
          onUpdated={() => fetchSessions(false)}
        />
      )}
    </div>
  );
};
export default PrintSessionsPage;
