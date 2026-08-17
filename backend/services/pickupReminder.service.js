import supabaseService from "./supabase.service.js";
import { sendPushToUser } from "./notification.service.js";

const REMINDER_TYPE = "10_minute_pickup";

const ELIGIBLE_STATUSES = [
  "pending",
  "confirmed",
  "printing",
];

const buildShopkeeperBody = (count) => {
  return `${count} order${count === 1 ? "" : "s"} need attention. Pickup is within 10 minutes.`;
};

const buildSupervisorBody = (shops) => {
  return shops
    .map(({ shopName, count }) => {
      return `${shopName} — ${count} order${count === 1 ? "" : "s"} need attention.`;
    })
    .join("\n");
};

export const runPickupReminderCheck = async () => {
  console.log("[PickupReminder] Checking upcoming pickups...");

  const now = new Date();

  const windowEnd = new Date(
    now.getTime() + 10 * 60 * 1000
  );

  const {
    data: orders,
    error: ordersError,
  } = await supabaseService.getOrdersForPickupReminder(
    now.toISOString(),
    windowEnd.toISOString(),
    ELIGIBLE_STATUSES
  );

  if (ordersError) {
    console.error(
      "[PickupReminder] Failed to query eligible orders:",
      ordersError.message
    );
    return;
  }

  if (!orders || orders.length === 0) {
    return;
  }

  console.log(
    `[PickupReminder] Found ${orders.length} eligible orders.`
  );

  /*
   * Claim reminder rows before sending.
   *
   * The UNIQUE(order_id, reminder_type) constraint prevents the
   * same order from being claimed twice.
   */
  const {
    data: claimedOrders,
    error: claimError,
  } = await supabaseService.claimPickupReminders(
    orders.map((order) => ({
      order_id: order.id,
      reminder_type: REMINDER_TYPE,
    }))
  );

  if (claimError) {
    console.error(
      "[PickupReminder] Failed to claim reminders:",
      claimError.message
    );
    return;
  }

  if (!claimedOrders || claimedOrders.length === 0) {
    return;
  }

  const claimedIds = new Set(
    claimedOrders.map((row) => row.order_id)
  );

  const eligibleOrders = orders.filter((order) =>
    claimedIds.has(order.id)
  );

  if (eligibleOrders.length === 0) {
    return;
  }

  /*
   * Group by shop.
   */
  const shops = new Map();

  /*
   * Group supervisor notifications by supervisor.
   */
  const supervisors = new Map();

  for (const order of eligibleOrders) {
    const shop = order.shop;

    if (!shop?.id) {
      console.error(
        `[PickupReminder] Order ${order.id} has no valid shop.`
      );
      continue;
    }

    let shopEntry = shops.get(shop.id);

    if (!shopEntry) {
      shopEntry = {
        shopId: shop.id,
        shopName: shop.shop_name || "Unnamed shop",
        ownerId: shop.owner_id || null,
        supervisorId: shop.supervisor_id || null,
        count: 0,
      };

      shops.set(shop.id, shopEntry);
    }

    shopEntry.count += 1;

    /*
     * Supervisor aggregation.
     *
     * supervisor_id comes directly from the shop relationship,
     * so a supervisor can only receive shops assigned to them.
     */
    if (shop.supervisor_id) {
      let supervisorShops =
        supervisors.get(shop.supervisor_id);

      if (!supervisorShops) {
        supervisorShops = new Map();
        supervisors.set(
          shop.supervisor_id,
          supervisorShops
        );
      }

      const supervisorShop =
        supervisorShops.get(shop.id) || {
          shopName: shop.shop_name || "Unnamed shop",
          count: 0,
        };

      supervisorShop.count += 1;

      supervisorShops.set(
        shop.id,
        supervisorShop
      );
    }
  }

  /*
   * SHOPKEEPER NOTIFICATIONS
   *
   * One notification per affected shop.
   */
  for (const shop of shops.values()) {
    if (!shop.ownerId) {
      console.error(
        `[PickupReminder] Shop ${shop.shopName} (${shop.shopId}) has no owner_id.`
      );

      continue;
    }

    try {
      console.log(
        `[PickupReminder] Shop ${shop.shopName}: ${shop.count} orders.`
      );

      await sendPushToUser({
        userId: shop.ownerId,
        title: "Pickup Reminder",
        body: buildShopkeeperBody(shop.count),
      });
    } catch (error) {
      console.error(
        `[PickupReminder] Shopkeeper notification failed for ${shop.shopName}:`,
        error.message
      );
    }
  }

  /*
   * SUPERVISOR NOTIFICATIONS
   *
   * One notification per supervisor.
   *
   * Only that supervisor's assigned shops are included.
   */
  for (const [
    supervisorId,
    supervisorShops,
  ] of supervisors) {
    const affectedShops = [
      ...supervisorShops.values(),
    ].sort((a, b) =>
      a.shopName.localeCompare(b.shopName)
    );

    if (affectedShops.length === 0) {
      continue;
    }

    try {
      console.log(
        `[PickupReminder] Supervisor ${supervisorId}: ${affectedShops.length} shops affected.`
      );

      await sendPushToUser({
        userId: supervisorId,
        title: "Pickup Alert",
        body: buildSupervisorBody(affectedShops),
      });
    } catch (error) {
      console.error(
        `[PickupReminder] Supervisor notification failed for ${supervisorId}:`,
        error.message
      );
    }
  }

  console.log(
    `[PickupReminder] Sent reminder processing for ${eligibleOrders.length} orders.`
  );
};