import "./shopNavbar.css";
import logo from "../../assets/logo.png";

const ShopNavbar = ({
  shop,
  isUpdating,
  onToggleShop,
  onToggleAccepting,
  onLogout,
  activeTab,
  setActiveTab,
  hasNewOrders,
  hasUrgentOrders,
  hasNewWalkin,
  hasNewScheduled,
}) => {
  return (
    <nav className="shop-navbar">
      <div className="shop-navbar-inner">
        {/* LEFT */}
        <div className="nav-left">
          <img src={logo} alt="Lovely Prints" className="nav-logo" />
          <span className="nav-title">{shop?.shop_name || "My Shop"}</span>
        </div>

        {/* CENTER */}
        <div className="nav-center">
          <button
            className={activeTab === "orders" ? "active" : ""}
            onClick={() => setActiveTab("orders")}
          >
            Orders
            {hasNewOrders && (
              <span
                className={`nav-notification `}
              >      NEW        </span>
            )}
          </button>
          <button
  className={activeTab === "walkin" ? "active" : ""}
  onClick={() => setActiveTab("walkin")}
>
  Walk-In
  {hasNewWalkin && (
    <span className="nav-notification">NEW</span>
  )}
</button>
          <button
  className={`${activeTab === "scheduled" ? "active" : ""}`}
  onClick={() => setActiveTab("scheduled")}
>
  Scheduled
  {hasNewScheduled && (
    <span className="nav-notification urgent">NEW</span>
  )}
</button>
          {/* <button
            className={`${activeTab === "discarded" ? "active" : ""}`}
            onClick={() => setActiveTab("discarded")}
          >
            Discarded
          </button> */}

          <button
            className={activeTab === "settings" ? "active" : ""}
            onClick={() => setActiveTab("settings")}
          >
            Pricing
          </button>

          <button
            className={activeTab === "analytics" ? "active" : ""}
            onClick={() => setActiveTab("analytics")}
          >
            Analytics
          </button>
          <button
  className={
    activeTab === "print-sessions"
      ? "active"
      : ""
  }
  onClick={() => setActiveTab("print-sessions")}
>
  Print Sessions
</button>
        </div>

        {/* RIGHT */}
        <div className="nav-right">
          <div className="shop-toggle">
            <span className={!shop?.is_active ? "muted" : ""}>Closed</span>

            <label className="switch">
              <input
                type="checkbox"
                checked={shop?.is_active}
                disabled={isUpdating}
                onChange={onToggleShop}
              />
              <span className="slider" />
            </label>

            <span className={shop?.is_active ? "active" : "muted"}>Open</span>
          </div>
          {/* Accepting Orders Toggle */}
          <div className="shop-toggle accepting-toggle">
            <span className={!shop?.is_accepting_orders ? "muted" : ""}>
              Offline
            </span>

            <label className="switch">
              <input
                type="checkbox"
                checked={shop?.is_accepting_orders}
                disabled={isUpdating}
                onChange={onToggleAccepting}
              />
              <span className="slider" />
            </label>

            <span className={shop?.is_accepting_orders ? "active" : "muted"}>
              Online
            </span>
          </div>

          {/* {sessionTimeLeft && (
            <div
              className={`session-timer ${
                sessionTimeLeft.startsWith("0:") ? "session-timer--warning" : ""
              }`}
              title="Session expires in"
            >
              {sessionTimeLeft}
            </div>
          )} */}

          <button className="logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default ShopNavbar;
