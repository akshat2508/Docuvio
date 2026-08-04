import { useEffect, useState, useRef } from "react";
import {
  getOrganisations,
  getShopsByOrganisation,
  updateShopStatus,
  getOrganisationAnalytics,
  getShopAnalytics,
  getShopOrders,
} from "../../services/adminService";

import OrganisationAnalytics from "./OrganisationAnalytics";
import ShopAnalytics from "./ShopAnalytics";
import OrganisationTrends from "./OrganisationTrends";
import ShopOrders from "./ShopOrders";
import OrderDrawer from "./OrderDrawer";
import ShopPrintOptionsModal from "./ShopPrintOptionsModal";
import CreateShopModal from "./CreateShopModal";
import logo from "/src/assets/logo.png"
import "./admin-theme.css";
import "./admin.css";

const AdminDashboard = () => {
  const [organisations, setOrganisations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [shops, setShops] = useState([]);

  const [orgAnalytics, setOrgAnalytics] = useState(null);

  const [selectedShop, setSelectedShop] = useState(null);
  const [shopAnalytics, setShopAnalytics] = useState(null);
  const [shopOrders, setShopOrders] = useState([]);

  const [loadingOrg, setLoadingOrg] = useState(true);
  const [loadingShopOrders, setLoadingShopOrders] = useState(false);

  const [activeOrder, setActiveOrder] = useState(null);
  const [printOptionsShop, setPrintOptionsShop] = useState(null);
const [revenueCalculated, setRevenueCalculated] = useState(false);
  const orgAnalyticsCache = useRef({});
  const shopAnalyticsCache = useRef({});
  const shopOrdersCache = useRef({});
const [showCreateShopModal, setShowCreateShopModal] = useState(false);
  /* =========================
  ======
     LOAD ORGANISATIONS
  =============================== */

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getOrganisations();
        setOrganisations(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingOrg(false);
      }
    };

    load();
  }, []);

  /* ===============================
     WHEN ORG CHANGES
  =============================== */

  useEffect(() => {
    if (!selectedOrg) return;

    // Reset shop state
    setSelectedShop(null);
    setShopAnalytics(null);
    setShopOrders([]);
    setActiveOrder(null);
    setRevenueCalculated(false);   // 👈 add this

    const loadShops = async () => {
      const data = await getShopsByOrganisation(selectedOrg.id);
      setShops(data);
    };

    const loadAnalytics = async () => {
      if (orgAnalyticsCache.current[selectedOrg.id]) {
        setOrgAnalytics(orgAnalyticsCache.current[selectedOrg.id]);
        return;
      }

      const res = await getOrganisationAnalytics(selectedOrg.id);
      orgAnalyticsCache.current[selectedOrg.id] = res.data;
      setOrgAnalytics(res.data);
    };

    loadShops();
    loadAnalytics();
  }, [selectedOrg]);

const handleRevenueCalculation = async () => {
  if (!selectedOrg || !shops.length) return;
  if (revenueCalculated) return;

  const ordersPerShop = await Promise.all(
    shops.map(shop => getShopOrders(shop.id))
  );

  const allOrders = ordersPerShop.flat();

  // ✅ Total Revenue
  const totalRevenue = allOrders.reduce(
    (sum, order) => sum + Number(order.total_price || 0),
    0
  );

  // ✅ Revenue Trend by Date
  const revenueMap = {};

  allOrders.forEach(order => {
    const date = new Date(order.created_at)
      .toISOString()
      .split("T")[0];

    if (!revenueMap[date]) {
      revenueMap[date] = 0;
    }

    revenueMap[date] += Number(order.total_price || 0);
  });

  const revenueByDate = Object.keys(revenueMap)
    .sort()
    .map(date => ({
      date,
      amount: revenueMap[date],
    }));

  const updated = {
    ...orgAnalytics,
    totalRevenue,
    revenueByDate,
  };

  orgAnalyticsCache.current[selectedOrg.id] = updated;
  setOrgAnalytics(updated);
  setRevenueCalculated(true);
};
  /* ===============================
     WHEN SHOP CHANGES
  =============================== */

  useEffect(() => {
    if (!selectedShop) return;

    const loadShopAnalytics = async () => {
      if (shopAnalyticsCache.current[selectedShop.id]) {
        setShopAnalytics(shopAnalyticsCache.current[selectedShop.id]);
        return;
      }

      const res = await getShopAnalytics(selectedShop.id);
      shopAnalyticsCache.current[selectedShop.id] = res.data;
      setShopAnalytics(res.data);
    };

    const loadShopOrders = async () => {
      setLoadingShopOrders(true);

      if (shopOrdersCache.current[selectedShop.id]) {
        setShopOrders(shopOrdersCache.current[selectedShop.id]);
        setLoadingShopOrders(false);
        return;
      }

      const orders = await getShopOrders(selectedShop.id);
      shopOrdersCache.current[selectedShop.id] = orders;
      setShopOrders(orders);
      setLoadingShopOrders(false);
    };

    loadShopAnalytics();
    loadShopOrders();
  }, [selectedShop]);

  /* ===============================
     TOGGLE SHOP STATUS
  =============================== */

  const handleToggleShopStatus = async (shop) => {
    await updateShopStatus(shop.id, !shop.is_active);
    const updated = await getShopsByOrganisation(selectedOrg.id);
    setShops(updated);
  };

  /* ===============================
     UI
  =============================== */

  if (loadingOrg) {
    return <div className="skeleton table-skeleton" />;
  }

  return (
  <div className="admin-layout-A">

    {/* TOPBAR */}
    <div className="admin-topbar-A">
      <div className="admin-brand-A">
        <img src={logo} alt="" />
        <h3 className="admin-brand-h3-A">Docuvio Admin Portal</h3>
      </div>

      <button
        className="logout-btn-A"
        onClick={() => {
          localStorage.clear();
          window.location.href = "/login";
        }}
      >
        Logout
      </button>
    </div>

    {/* BODY */}
    <div className="admin-body-A">

      {/* SIDEBAR */}
      <div className="admin-sidebar-A">
        <h4 className="sidebar-title-A">Organisations</h4>

        {organisations.map((org) => (
          <div
            key={org.id}
            className={`sidebar-item-A ${
              selectedOrg?.id === org.id ? "active" : ""
            }`}
            onClick={() => setSelectedOrg(org)}
          >
            {org.name}
          </div>
        ))}
      </div>

      {/* WORKSPACE */}
      <div className="admin-workspace-A">

        {!selectedOrg && (
          <div className="empty-state-A">
            Select an organisation to begin
          </div>
        )}

        {/* ORGANISATION VIEW */}
        {selectedOrg && !selectedShop && (
          <>
            <OrganisationAnalytics analytics={orgAnalytics}
              onRevenueClick={handleRevenueCalculation}
                revenueCalculated={revenueCalculated}
           />

            <OrganisationTrends
              ordersByDate={orgAnalytics?.ordersByDate}
              revenueByDate={orgAnalytics?.revenueByDate}
            />

            {/* 🟢 NEW SHOPS SECTION WRAPPER */}
            <div className="shops-section-A">
             <div className="shops-header-A">
  <h3>Shops</h3>

  <button
    className="create-shop-btn-A"
    onClick={() => setShowCreateShopModal(true)}
  >
    + Create Shop
  </button>
</div>

              <div className="shop-grid-A">
                {shops.map((shop) => (
                  <div key={shop.id} className="shop-card-A">

                    <div
                      className="shop-card-main-A"
                      onClick={() => setSelectedShop(shop)}
                    >
                      <div className="shop-card-title-A">
                        {shop.shop_name}
                      </div>

                      <div className={`shop-badge-A ${
                        shop.is_active ? "open" : "closed"
                      }`}>
                        {shop.is_active ? "Open" : "Closed"}
                      </div>
                    </div>

                    <div className="shop-card-actions-A">
                      <button
                        onClick={() => handleToggleShopStatus(shop)}
                      >
                        {shop.is_active ? "Close" : "Open"}
                      </button>

                      <button
                        onClick={() => setPrintOptionsShop(shop)}
                      >
                        Print Options
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* SHOP VIEW */}
        {selectedShop && (
          <>
            <div className="shop-header-A">
              <button
                className="back-btn-A"
                onClick={() => setSelectedShop(null)}
              >
                ← Back
              </button>


              <button className="shop-header-btn-A"
                onClick={() => setPrintOptionsShop(selectedShop)}
              >
                Configure Print Options
              </button>
            </div>

            <ShopAnalytics
              shop={selectedShop}
              analytics={shopAnalytics}
            />

            <ShopOrders
              orders={shopOrders}
              loading={loadingShopOrders}
              onOrderClick={setActiveOrder}
            />
          </>
        )}

      </div>
    </div>

    <OrderDrawer
      order={activeOrder}
      onClose={() => setActiveOrder(null)}
    />

    <ShopPrintOptionsModal
      shop={printOptionsShop}
      onClose={() => setPrintOptionsShop(null)}
    />
    <CreateShopModal
  open={showCreateShopModal}
  organisationId={selectedOrg?.id}
  onClose={() => setShowCreateShopModal(false)}
  onCreated={(shop) => {
    setShops((prev) => [...prev, shop]);
  }}
/>

  </div>
);
};

export default AdminDashboard;