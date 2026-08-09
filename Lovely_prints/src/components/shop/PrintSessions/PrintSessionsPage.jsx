import { useEffect, useState } from "react";
import {
  getShopPrintSessions,
} from "../../../services/printSessionService";
import PrintSessionCard from "./PrintSessionCard";
import PrintSessionReview from "./PrintSessionReview";
import "./printSessions.css";

const PrintSessionsPage = () => {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] =
    useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    try {
      setLoading(true);

      const res = await getShopPrintSessions();

      if (res?.success) {
        setSessions(res.data || []);
      }
    } catch (error) {
      console.error(
        "Failed to fetch print sessions",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  if (loading) {
    return (
      <div className="print-sessions-page">
        <h1>Print Sessions</h1>
        <p>Loading sessions...</p>
      </div>
    );
  }

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

      {selectedSession && (
        <PrintSessionReview
          session={selectedSession}
          onClose={() =>
            setSelectedSession(null)
          }
          onUpdated={fetchSessions}
        />
      )}

    </div>
  );
};

export default PrintSessionsPage;