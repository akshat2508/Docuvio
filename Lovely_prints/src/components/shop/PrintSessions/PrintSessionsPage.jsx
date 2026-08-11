import { useEffect, useState, useCallback } from "react";
import {
  getShopPrintSessions,
} from "../../../services/printSessionService";

import PrintSessionCard from "./PrintSessionCard";
import PrintSessionReview from "./PrintSessionReview";

import { supabase } from "../../../services/supabase";

import "./printSessions.css";

const PrintSessionsPage = () => {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] =
    useState(null);

  const [loading, setLoading] = useState(true);

  // ==========================================
  // FETCH SESSIONS
  // ==========================================

  const fetchSessions = useCallback(
    async (showLoading = false) => {
      try {
        if (showLoading) {
          setLoading(true);
        }

        const res = await getShopPrintSessions();

        if (res?.success) {
          const newSessions = res.data || [];

          setSessions(newSessions);

          // Keep opened review modal in sync
          setSelectedSession((current) => {
            if (!current) {
              return null;
            }

            const updated = newSessions.find(
              (session) => session.id === current.id
            );

            return updated || current;
          });
        }
      } catch (error) {
        console.error(
          "Failed to fetch print sessions",
          error
        );
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    []
  );

  // ==========================================
  // INITIAL FETCH
  // ==========================================

  useEffect(() => {
    fetchSessions(true);
  }, [fetchSessions]);

  // ==========================================
  // REALTIME PRINT SESSION UPDATES
  // ==========================================

  useEffect(() => {
    const accessToken =
      localStorage.getItem("access_token");

    if (!accessToken) {
      console.warn(
        "Print Sessions realtime: access token missing"
      );

      return;
    }

    // Make sure Supabase realtime uses
    // the current authenticated user token.
    supabase.realtime.setAuth(accessToken);

    console.log(
      "🔄 Starting Print Sessions realtime listener..."
    );

    const channel = supabase
      .channel("shop-print-sessions-realtime")

      // ----------------------------------------
      // NEW SESSION
      // ----------------------------------------

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "print_sessions",
        },
        (payload) => {
          console.log(
            "🆕 Print session created:",
            payload.new
          );

          fetchSessions(false);
        }
      )

      // ----------------------------------------
      // SESSION UPDATED
      // ----------------------------------------

      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "print_sessions",
        },
        (payload) => {
          console.log(
            "🔄 Print session updated:",
            payload.new
          );

          fetchSessions(false);
        }
      )

      // ----------------------------------------
      // SESSION DELETED
      // ----------------------------------------

      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "print_sessions",
        },
        (payload) => {
          console.log(
            "🗑️ Print session deleted:",
            payload.old
          );

          fetchSessions(false);
        }
      )

      .subscribe((status) => {
        console.log(
          "Print Sessions realtime status:",
          status
        );
      });

    return () => {
      console.log(
        "🧹 Removing Print Sessions realtime listener"
      );

      supabase.removeChannel(channel);
    };
  }, [fetchSessions]);

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div className="print-sessions-page">
        <div className="print-sessions-header">
          <div>
            <h1>Print Sessions</h1>
            <p>
              Review live customer printing sessions
              and send quotations.
            </p>
          </div>
        </div>

        <div className="empty-sessions">
          Loading sessions...
        </div>
      </div>
    );
  }

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="print-sessions-page">

      {/* ================= HEADER ================= */}

      <div className="print-sessions-header">
        <div>
          <h1>Print Sessions</h1>

          <p>
            Review live customer printing sessions
            and send quotations.
          </p>
        </div>
      </div>

      {/* ================= SESSION LIST ================= */}

      {sessions.length === 0 ? (
        <div className="empty-sessions">
          <h3>No active print sessions</h3>

          <p>
            Customer sessions will appear here
            when they connect to your shop.
          </p>
        </div>
      ) : (
        <div className="print-session-list">

          {sessions.map((session) => (
            <PrintSessionCard
              key={session.id}
              session={session}
              onOpen={() =>
                setSelectedSession(session)
              }
            />
          ))}

        </div>
      )}

      {/* ================= REVIEW MODAL ================= */}

      {selectedSession && (
        <PrintSessionReview
          session={selectedSession}
          onClose={() =>
            setSelectedSession(null)
          }
          onUpdated={() =>
            fetchSessions(false)
          }
        />
      )}

    </div>
  );
};

export default PrintSessionsPage;