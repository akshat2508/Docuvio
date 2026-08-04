import api from "./api";

export const getOrganisations = async () => {
  const res = await api.get("/auth/organisations");
  return res.data.data;
};

export const getShopsByOrganisation = async (orgId) => {
  const res = await api.get(`/admin/organisations/${orgId}/shops`);
  return res.data.data;
};

export const updateShopStatus = async (shopId, is_active) => {
  const res = await api.patch(
    `/admin/shops/${shopId}/status`,
    { is_active }
  );
  return res.data.data;
};

export const getOrganisationAnalytics = async (organisationId) => {
  const res = await api.get(
    `/admin/analytics/${organisationId}`
  );
  return res.data;
};

export const getShopAnalytics = async (shopId) => {
  const res = await api.get(
    `/admin/shops/${shopId}/analytics`
  );
  return res.data;
};
export const getShopOrders = async (shopId) => {
  const res = await api.get(`/admin/shops/${shopId}/orders`);
  return res.data.data;
};

// PAPER
export const getShopPaperTypes = async (shopId) =>
  (await api.get(`/admin/shops/${shopId}/paper-types`)).data.data;

export const addShopPaperType = async (shopId, payload) =>
  (await api.post(`/admin/shops/${shopId}/paper-types`, payload)).data.data;

export const toggleShopPaperType = async (id, is_active) =>
  (await api.patch(`/admin/paper-types/${id}/toggle`, { is_active })).data.data;


// COLOR
export const getShopColorModes = async (shopId) =>
  (await api.get(`/admin/shops/${shopId}/color-modes`)).data.data;

export const addShopColorMode = async (shopId, payload) =>
  (await api.post(`/admin/shops/${shopId}/color-modes`, payload)).data.data;

export const toggleShopColorMode = async (id, is_active) =>
  (await api.patch(`/admin/color-modes/${id}/toggle`, { is_active })).data.data;


// FINISH
export const getShopFinishTypes = async (shopId) =>
  (await api.get(`/admin/shops/${shopId}/finish-types`)).data.data;

export const addShopFinishType = async (shopId, payload) =>
  (await api.post(`/admin/shops/${shopId}/finish-types`, payload)).data.data;

export const toggleShopFinishType = async (id, is_active) =>
  (await api.patch(`/admin/finish-types/${id}/toggle`, { is_active })).data.data;



// ==========================================
// SHOP DRAFTS
// ==========================================


export const createShopDraft = async (payload) => {
  const res = await api.post("/admin/shops", payload);
  return res.data.data;
};


export const inviteVendor = async (shopId) => {
  const res = await api.post(
    `/admin/shops/${shopId}/invite`
  );

  return res.data.data;
};