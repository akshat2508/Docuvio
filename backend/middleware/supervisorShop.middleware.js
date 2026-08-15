import { supabaseAdmin } from "../services/supabase.service.js";

const requireSupervisorShopAccess = async (req, res, next) => {
  try {
    const supervisorId = req.user?.id;
    const organisationId = req.user?.organisationId;
    const { shopId } = req.params;

    if (!supervisorId) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found",
      });
    }

    if (!organisationId) {
      return res.status(403).json({
        success: false,
        message: "Organisation not assigned",
      });
    }

    if (!shopId) {
      return res.status(400).json({
        success: false,
        message: "Shop ID is required",
      });
    }

    const { data: shop, error } = await supabaseAdmin
      .from("shops")
      .select(`
        id,
        shop_name,
        block,
        organisation_id,
        supervisor_id,
        owner_id,
        owner_name,
        owner_email,
        is_active,
        is_accepting_orders,
        status,
        open_time,
        close_time
      `)
      .eq("id", shopId)
      .eq("supervisor_id", supervisorId)
      .eq("organisation_id", organisationId)
      .maybeSingle();

    if (error) {
      console.error("SUPERVISOR SHOP ACCESS ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to verify shop access",
      });
    }

    if (!shop) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this shop",
      });
    }

    // Make the verified shop available to downstream controllers.
    req.shop = shop;

    next();
  } catch (err) {
    next(err);
  }
};

export default requireSupervisorShopAccess;