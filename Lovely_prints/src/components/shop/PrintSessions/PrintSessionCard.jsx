const PrintSessionCard = ({
  session,
  onOpen,
}) => {
  return (
    <div className="print-session-card">

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

      <div className="session-card-status">
        {session.status}
      </div>

      <div className="session-card-time">
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