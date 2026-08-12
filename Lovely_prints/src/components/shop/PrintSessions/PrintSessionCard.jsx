import './printSessionCard.css'
const PrintSessionCard = ({
  session,
  onOpen,
}) => {
  return (
    <div className="print-session-card-xz">

      <div>
        <h3>
          {session.customer_name ||
            "Customer"}
        </h3>

        <p>
          {session.customer_phone ||
            "No phone"}
        </p>
      </div>

      <div className="session-card-status-xz">
        {session.status}
      </div>

      <div className="session-card-time-xz">
        {new Date(
          session.created_at
        ).toLocaleTimeString()}
      </div>

      <button onClick={onOpen}>
        Review Session
      </button>

    </div>
  );
};

export default PrintSessionCard;