import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStudentData } from "../context/StudentDataContext";
import ShopSkeleton from "../skeletons/ShopSkeleton";
import ShopFallBack from "../assets/shop.png";
import OpenPoliciesModal from "../modals/OpenPoliciesModal";

import "./studentHome.css";


const StudentHome = () => {
  const navigate = useNavigate();
  const { shops, shopsLoading, fetchShops, setFlowStage } = useStudentData();
  const [shopStatusFilter, setShopStatusFilter] = useState("all");

  const [searchTerm, setSearchTerm] = useState("");
  const [filteredShops, setFilteredShops] = useState([]);


  useEffect(() => {
    fetchShops();
  }, []);
 
  useEffect(() => {
    if (!shops) return;

    const filtered = shops.filter((shop) => {
      const matchesSearch =
        shop.shop_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shop.block.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        shopStatusFilter === "all" ||
        (shopStatusFilter === "open" && shop.is_active) ||
        (shopStatusFilter === "closed" && !shop.is_active);

      return matchesSearch && matchesStatus;
    });

    setFilteredShops(filtered);
  }, [searchTerm, shops, shopStatusFilter]);

  if (shopsLoading) {
    return (
      <div className="student-home">
        <h1 className="student-home-title">Choose a Print Shop</h1>
        <div className="shop-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <ShopSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }
const getShopBanner = (shop) => {
  const isOpen = shop.is_active;
  const isAcceptingOrder = shop.is_accepting_orders;

  if (isOpen && isAcceptingOrder) {
    return {
      text: "OPEN",
      className: "banner-open",
    };
  }

  if (isOpen && !isAcceptingOrder) {
    return {
      text: "Open for Walk-in Orders",
      className: "banner-walkin",
    };
  }

  if (!isOpen && isAcceptingOrder) {
    return {
      text: "Online Orders Available",
      className: "banner-online",
    };
  }

  return {
    text: "Currently Closed",
    className: "banner-closed",
  };
};
  return (
    <div className="student-home">


      <h1 className="student-home-title">Choose a Print Shop</h1>

      {/* Search */}
      <div className="shop-filter-AB">
        <div className="shop-search-A">
          <input
            type="text"
            placeholder="Search by shop name or block..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="shop-filter-A">
          <button
            className={shopStatusFilter === "all" ? "active" : ""}
            onClick={() => setShopStatusFilter("all")}
          >
            All
          </button>

          <button
            className={shopStatusFilter === "open" ? "active" : ""}
            onClick={() => setShopStatusFilter("open")}
          >
            Open
          </button>

          <button
            className={shopStatusFilter === "closed" ? "active" : ""}
            onClick={() => setShopStatusFilter("closed")}
          >
            Closed
          </button>
        </div>
      </div>

      <div className="shop-grid">
        {filteredShops.map((shop) => (
          <div
            key={shop.id}
            className={`shop-card-AB
  ${!shop.is_active && shop.is_accepting_orders ? "shop-closed-soft" : ""}
  ${!shop.is_active && !shop.is_accepting_orders ? "shop-disabled" : ""}`}
            onClick={() => {
  // 🚫 Block ONLY when shop is closed AND not accepting online orders
  if (!shop.is_active && !shop.is_accepting_orders) return;

  // ✅ Otherwise allow entering shop page
  setFlowStage(2);
  navigate(`/student/shop/${shop.id}`);
}}
          >
            {/* Open / Closed Tag */}
            {(() => {
  const banner = getShopBanner(shop);

  return (
    <div className={`shop-status-tag ${banner.className}`}>
      {banner.text}
    </div>
  );
})()}

            <div className="shop-banner-AB">
              <img
                src={shop.banner_url || ShopFallBack}
                alt={shop.shop_name}
                style={{ height: "220px", objectFit: "contain" }}
              />
            </div>

            <div className="shop-info-A">
              <div className="shop-name-badge-A">
                <h3 className="shop-name-A">{shop.shop_name}</h3>
              </div>

              <div className="shop-details-box-A">
                <span className="shop-block-A">
                  <strong>Level:</strong> {shop.block}
                </span>
              </div>

              <div className="shop-details-box-A">
                <span className="shop-time-A">
                  <strong>Opens at:</strong> {shop.open_time?.slice(0, 5)} AM
                </span>
              </div>
              <div className="shop-details-box-A">
                <span className="shop-time-A">
                  <strong>Closes at:</strong> {shop.close_time?.slice(0, 5)} PM
                </span>
              </div>
            </div>
          </div>
        ))}

        {filteredShops.length === 0 && !shopsLoading && (
          <div className="no-shops-minimal-A">
            <div className="no-shops-icon-A">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9V2h12v7" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <path d="M6 14h12v8H6z" />
              </svg>
            </div>

            {/* Show heading ONLY when Open filter has no shops */}
            {shopStatusFilter === "open" && <h3>No print shops available</h3>}

            <p>
              {searchTerm
                ? "Try adjusting your search or filters."
                : shopStatusFilter === "open"
                  ? "All shops are currently closed."
                  : shopStatusFilter === "closed"
                    ? "All available shops are open right now."
                    : "Print shops will appear here once available."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentHome;
