import { ArrowRight, Clock3, UserRound } from "lucide-react";
import "./printSessionCard.css";

const STATUS_LABELS = {
  created: "Connecting",
  connected: "Connected",
  customer_details: "Customer Details",
  files_uploading: "Uploading Files",
  files_uploaded: "Files Received",
  reviewing: "Shop Reviewing",
  quote_ready: "Quote Sent",
  payment_pending: "Awaiting Payment",
  paid: "Paid",
  printing: "Printing",
  ready_for_pickup: "Ready for Pickup",
  completed: "Completed",
  expired: "Expired",
};

const getStatusLabel = (status) =>
  STATUS_LABELS[status] || status || "Unknown";

const getStatusTone = (status) => {
  if (["files_uploading", "files_uploaded"].includes(status)) {
    return "files";
  }

  if (["reviewing", "quote_ready"].includes(status)) {
    return "review";
  }

  if (status === "payment_pending") {
    return "payment";
  }

  if (
    ["paid", "printing", "ready_for_pickup", "completed"].includes(
      status
    )
  ) {
    return "paid";
  }

  return "neutral";
};

const PrintSessionCard = ({ session, onOpen }) => {
  const handleOpen = () => {
    if (typeof onOpen === "function") {
      onOpen();
    }
  };

  const status = session?.status;
  const tone = getStatusTone(status);

  return (
    <div className="print-session-card-xz">
      <div className="print-session-card-customer">
        <div className="print-session-card-avatar">
          <UserRound size={16} />
        </div>

        <div className="print-session-card-customer-copy">
          <h3>{session?.customer_name || "Customer"}</h3>

          <p>{session?.customer_phone || "No phone provided"}</p>
        </div>
      </div>

      <div className={`session-card-status-xz ${tone}`}>
        <span />
        {getStatusLabel(status)}
      </div>

      <div className="session-card-time-xz">
        <Clock3 size={13} />

        {session?.created_at
          ? new Date(session.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—"}
      </div>

      <button
        type="button"
        className="print-session-review-btn-xz"
        onClick={handleOpen}
      >
        Review Session
        <ArrowRight size={15} />
      </button>
    </div>
  );
};

export default PrintSessionCard;