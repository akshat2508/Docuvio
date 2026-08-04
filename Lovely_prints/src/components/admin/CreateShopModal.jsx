import { useState } from "react";
import { createShopDraft } from "../../services/adminService";

const CreateShopModal = ({ open, organisationId, onClose, onCreated }) => {
  const [form, setForm] = useState({
    shop_name: "",
    block: "",
    owner_name: "",
    owner_email: "",
    open_time: "09:00",
    close_time: "17:00",
  });

  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const created = await createShopDraft({
        ...form,
        organisation_id: organisationId,
      });

      onCreated(created);

      setForm({
        shop_name: "",
        block: "",
        owner_name: "",
        owner_email: "",
        open_time: "09:00",
        close_time: "17:00",
      });

      onClose();
    } catch (err) {
      alert(err?.response?.data?.message || "Unable to create shop.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-shop-overlay">
      <div className="create-shop-modal">
        <h2>Create Shop</h2>

        <input
          name="shop_name"
          placeholder="Shop Name"
          value={form.shop_name}
          onChange={handleChange}
        />

        <input
          name="block"
          placeholder="Block"
          value={form.block}
          onChange={handleChange}
        />

        <input
          name="owner_name"
          placeholder="Owner Name"
          value={form.owner_name}
          onChange={handleChange}
        />

        <input
          name="owner_email"
          placeholder="Owner Email"
          value={form.owner_email}
          onChange={handleChange}
        />

        <div className="time-row-A">
          <div>
            <label>Opening Time</label>

            <input
              type="time"
              name="open_time"
              value={form.open_time}
              onChange={handleChange}
            />
          </div>

          <div>
            <label>Closing Time</label>

            <input
              type="time"
              name="close_time"
              value={form.close_time}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="create-shop-actions">
          <button onClick={onClose} disabled={loading}>
            Cancel
          </button>

          <button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating..." : "Create Shop"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateShopModal;
