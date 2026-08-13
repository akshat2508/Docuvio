import { useState , useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import { useParams, useNavigate } from "react-router-dom";

import {
  createStudentOrder,
  uploadFile,
  attachDocumentToOrder,
} from "../../../services/studentService";
import { useStudentData } from "../context/StudentDataContext";

import { startPayment } from "../Payments";
import "./createOrderModal.css";
import PrintStackLoader from "../skeletons/PrintStackLoader";
import OpenPoliciesModal from "./OpenPoliciesModal";
import Convertor from "../skeletons/Converter";
import InstructionsModal from "./InstructionsModal";
import FilePreviewModal from "./FilePreviewModal";
const HANDLING_FEE = 10;

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return null;

  const parts = timeStr.split(":");
  if (parts.length < 2) return null;

  const h = Number(parts[0]);
  const m = Number(parts[1]);

  if (Number.isNaN(h) || Number.isNaN(m)) return null; 

  return h * 60 + m;
};

const getMinutesFromDate = (date) => date.getHours() * 60 + date.getMinutes();

const convertToPDF = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${import.meta.env.VITE_CONVERTER_URL}/convert`, {
    method: "POST",
    headers: {
      "x-api-key": import.meta.env.VITE_CONVERTER_API_KEY,
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }

  const blob = await res.blob();

  return new File([blob], file.name.replace(/\.\w+$/, ".pdf"), {
    type: "application/pdf",
  });
};

const CreateOrderPage = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const { shopId } = useParams();
  const navigate = useNavigate();
  const { shops, fetchShops, fetchShopOptions, setFlowStage } = useStudentData();
  const [shop, setShop] = useState(null);
  const [shopOptions, setShopOptions] = useState(null);
  const [agreedPolicies, setAgreedPolicies] = useState(false);
const [showPoliciesModal, setShowPoliciesModal] = useState(false);

useEffect(() => {
  if (currentStep === 3) {
    setAgreedPolicies(false);
  }
}, [currentStep]);
  
  useEffect(() => {
    const loadData = async () => {
      const allShops = shops || (await fetchShops());
      const found = allShops?.find(s => String(s.id) === String(shopId));
      setShop(found);
  
      const opts = await fetchShopOptions(shopId);
      setShopOptions(opts);
    };
  
    loadData();
  }, [shopId]);
  useEffect(() => {
  // Modal starts at Print Options (Sidebar Step 2)
  setFlowStage(currentStep + 1);
}, [currentStep]);



  /* ====== Print Config ====== */
  const [paperType, setPaperType] = useState("");
  const [colorMode, setColorMode] = useState("");
  const [finishType, setFinishType] = useState("");
  const [orientation, setOrientation] = useState("portrait");
  const [copies, setCopies] = useState(1);
  const [description, setDescription] = useState("");

  /* ====== File ====== */
  const [selectedFile, setSelectedFile] = useState(null);
  const [pageCount, setPageCount] = useState(1);

  /* ====== Submit State ====== */
  const [submitting, setSubmitting] = useState(false);
  const [disableSubmit, setDisableSubmit] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [showConverter , setShowConverter] = useState(false);
  const [loaderText, setLoaderText] = useState("Preparing your documents…");
  const [fileError, setFileError] = useState("");

  /* ====== Pickup Time ====== */
  const [pickupAt, setPickupAt] = useState("");
  const [pickupError, setPickupError] = useState("");

  const [selectedDay, setSelectedDay] = useState("today");
const [selectedTime, setSelectedTime] = useState(null);
const isHandled = selectedDay === "tomorrow";
const [dayError, setDayError] = useState("");
const [isCVMode, setIsCVMode] = useState(false);
const [showInstructions, setShowInstructions] = useState(false);
const [printSide, setPrintSide] = useState("single");
const [showPreview, setShowPreview] = useState(false);



  /* ====== Helpers ====== */
  const selectedPaper = shopOptions?.paper_types?.find(
    (p) => p.id === paperType,
  );
  const selectedColor = shopOptions?.color_modes?.find(
    (c) => c.id === colorMode,
  );
  const selectedFinish = shopOptions?.finish_types?.find(
    (f) => f.id === finishType,
  );

const calculatePlatformFee = (amount, orderType) => {
  if (orderType === "walk_in") {
    return amount < 100 ? 1 : 2;
  }

  // online
  if (amount < 20) return 2;
  if (amount <= 50) return 4;
  if (amount <= 80) return 6;
  if (amount <= 100) return 9;
  if (amount <= 200) return 13;
  return 16;
};

const documentPrice = (() => {
  if (!selectedPaper) return 0;

  const base = Number(selectedPaper.base_price || 0);
  const doublePrice = Number(
    selectedPaper.double_side_price || base
  );

  const colorExtra = Number(selectedColor?.extra_price || 0);
  const finishExtra = Number(selectedFinish?.extra_price || 0);

  const pages = Number(pageCount);
  const c = Number(copies);

  if (!pages || !c) return 0;

  // 🔥 Sheet logic (MATCHES BACKEND)
  const sheets =
    printSide === "double"
      ? Math.ceil(pages / 2)
      : pages;

  // 🔥 Price per sheet
  const pricePerSheet =
    printSide === "double"
      ? doublePrice
      : base;

  return sheets * c * (pricePerSheet + colorExtra + finishExtra);
})();

const orderType = "online"; // since frontend flow is online
const platformFee = calculatePlatformFee(documentPrice, orderType);
 const totalPrice = documentPrice + platformFee + (isHandled ? HANDLING_FEE : 0);

  /* ✅ Step validation */
  const canProceedStep1 =
    paperType && colorMode && finishType && orientation && copies > 0;

  const canProceedStep2 =
    selectedFile && !fileError && pickupAt && !pickupError;

  const canSubmit =
    canProceedStep1 && canProceedStep2 && agreedPolicies
    && !submitting && !disableSubmit;

  const getPdfPageCount = async (file) => {
    const buffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(buffer);
    return pdf.getPageCount();
  };
  const generateTimeSlots = () => {
  const openMinutes = parseTimeToMinutes(shop.open_time);
  const closeMinutes = parseTimeToMinutes(shop.close_time);

  if (openMinutes === null || closeMinutes === null) return [];

  const slots = [];
  const interval = 30;       // slot interval
  const pickupBuffer = 30;   // must finish before closing

  const roundToNextSlot = (minutes, interval) =>
    Math.ceil(minutes / interval) * interval;

  let start = openMinutes;
  let end = closeMinutes - pickupBuffer;

  // TODAY logic
  if (selectedDay === "today") {
    const nowMinutes = getMinutesFromDate(new Date());

    const earliest = Math.max(openMinutes, nowMinutes + 30);

    start = roundToNextSlot(earliest, interval);
  }

  // TOMORROW logic
  if (selectedDay === "tomorrow") {
    start = openMinutes + 30;
  }

  for (let mins = start; mins <= end; mins += interval) {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;

    const formatted = new Date(0, 0, 0, hours, minutes)
      .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    slots.push({
      label: formatted,
      hours,
      minutes
    });
  }

  return slots;
};
useEffect(() => {
  if (!selectedTime) return;

  const baseDate = new Date();
  if (selectedDay === "tomorrow") {
    baseDate.setDate(baseDate.getDate() + 1);
  }

  baseDate.setHours(selectedTime.hours, selectedTime.minutes, 0, 0);

  setPickupAt(baseDate.toISOString());
  setPickupError("");
}, [selectedTime, selectedDay]);



  /* ====== Submit Handler ====== */
  const handleSubmitAndPay = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    setDisableSubmit(true);
    setShowLoader(true);
    setLoaderText("Preparing your documents…");

    try {
      const orderRes = await createStudentOrder({
        shop_id: shop.id,
        organisation_id: shop.organisation_id,
        description: description?.trim() || null,
        orientation,
        is_handled : selectedDay === "tomorrow",
        pickup_at: pickupAt,  
      });

      const order = orderRes.data;

      const uploadRes = await uploadFile(selectedFile);
      const fileKey = uploadRes.data.fileKey;

      await attachDocumentToOrder(order.id, {
        fileKey,
        fileName: selectedFile.name,
        page_count: pageCount,
        copies,
        paper_type_id: paperType,
        color_mode_id: colorMode,
        finish_type_id: finishType,
        print_side: printSide
      });

      setLoaderText("Redirecting to payment gateway…");

      startPayment(
        { ...order, total_price: totalPrice },
        // ✅ success
        () => {
          setShowLoader(false);
          setFlowStage(5);
           navigate("/student/orders");
        },
        // ❌ failure / cancel
        (reason) => {
          setShowLoader(false);
          setDisableSubmit(false);
          setSubmitting(false);
          alert(reason || "Payment not completed");
        },
      );
    } catch (err) {
      // console.error("FULL ERROR:", err);
      // console.error("RESPONSE DATA:", err?.response?.data);

      setShowLoader(false);
      setSubmitting(false);
      setDisableSubmit(false);

      alert(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to place order",
      );
    }
  };

  const handleAutoFillCV = () => {
  if (!shopOptions) return;

 const newState = !isCVMode;
  setIsCVMode(newState);

  // ❌ If turning OFF → reset
  if (!newState) {
    setPaperType("");
    setColorMode("");
    setFinishType("");
    setOrientation("portrait");
    setCopies(1);
    return;
  }
  const bondPaper = shopOptions.paper_types.find((p) =>
    p.name.toLowerCase().includes("bond")
  );

  // ✅ fallback (if bond not found)
  const defaultPaper = bondPaper || shopOptions.paper_types[0];

  // ✅ default color (prefer bw)
  const bwColor = shopOptions.color_modes.find((c) =>
    c.name.toLowerCase().includes("bond") ||
    c.name.toLowerCase().includes("bond")
  );

  const defaultColor = bwColor || shopOptions.color_modes[0];

  // ✅ default finish (normal)
  const normalFinish = shopOptions.finish_types.find((f) =>
    f.name.toLowerCase().includes("standard")
  );

  const defaultFinish = normalFinish || shopOptions.finish_types[0];

  // 🔥 APPLY VALUES
  setPaperType(defaultPaper?.id || "");
  setColorMode(defaultColor?.id || "");
  setFinishType(defaultFinish?.id || "");
  setOrientation("portrait");
  setCopies(1);
};

// const isUrgentDisabled = (() => {
//   if (!selectedTime) return true;

//   const pickup = new Date(pickupAt);
//   const pickupMinutes = getMinutesFromDate(pickup);
//   const closeMinutes = parseTimeToMinutes(shop.close_time);

//   return closeMinutes - pickupMinutes < 60;
// })();

  // const shopIsClosedNow = (() => {
  //   const openMinutes = parseTimeToMinutes(shop?.open_time);
  //   const closeMinutes = parseTimeToMinutes(shop?.close_time);

  //   if (openMinutes === null || closeMinutes === null) return false;

  //   const nowMinutes = getMinutesFromDate(new Date());
  //   return nowMinutes < openMinutes || nowMinutes >= closeMinutes;
  // })();
  
const shopNotAcceptingOrders = shop?.is_accepting_orders === false;
const hasShopClosedToday = () => {
  if (!shop?.close_time) return false;

  const closeMinutes = parseTimeToMinutes(shop.close_time);
  const nowMinutes = getMinutesFromDate(new Date());

  return nowMinutes >= closeMinutes;
};
if (!shop || !shopOptions) {
  return (
    <div className="create-order-page">
      <div className="create-order-container">
        <p className="muted">Loading shop data…</p>
      </div>
    </div>
  );
}
  return (
  <div className="create-order-page">
      {showPreview && (
        <FilePreviewModal
          file={selectedFile}
          onClose={() => setShowPreview(false)}
        />
      )}
    {showLoader && <PrintStackLoader />}
    {showConverter && <Convertor />}
    {showInstructions && (
      <InstructionsModal onClose={() => setShowInstructions(false)} />
    )}
    {showPoliciesModal && (
  <OpenPoliciesModal
    onAccept={() => {
      setAgreedPolicies(true);
      setShowPoliciesModal(false);
    }}
  />
)}

    <div className="create-order-container">

      {/* HEADER */}
      <div className="create-header">
      <div>
        <h1>Create Print Order</h1>
        <p>
          {shop.shop_name} • {shop.open_time.slice(0, 5)}–
          {shop.close_time.slice(0, 5)}
        </p>
      </div>

      {/* 🔥 INFO BUTTON */}
      <button
        className="info-btn-j"
        onClick={() => setShowInstructions(true)}
      >
        ⓘ
      </button>
    </div>

      {/* PROGRESS */}
      <div className="modal-progress">
        {[2, 3, 4].map((stage, index) => {
          const isActive = currentStep === index + 1;
          const isCompleted = currentStep > index + 1;

          return (
            <div
              key={stage}
              className={`progress-step 
                ${isActive ? "active" : ""} 
                ${isCompleted ? "completed" : ""}`}
            >
              <div className="progress-dot" />
              <span className="progress-label">
                {stage === 2 && "Print Options"}
                {stage === 3 && "Upload & Pickup"}
                {stage === 4 && "Review Order"}
              </span>
            </div>
          );
        })}
      </div>

      {/* MAIN GRID */}
      <div className="create-main-grid">

        {/* LEFT SIDE */}
        <div className="create-left">
          <div className="step-card">

            {/* STEP 1 */}
            {currentStep === 1 && (
              <div className="step-form">
                <h3 className="step-title">Configure Print Settings</h3>
               <div
  className={`cv-checkbox ${isCVMode ? "checked" : ""}`}
  onClick={handleAutoFillCV}
>
  <div className="checkbox-box">
    {isCVMode && <div className="checkbox-tick">✓</div>}
  </div>

  <span>CV (Recommended)</span>
</div>

                <div className="form-group">
                  <label className="modal-label">Paper Type *</label>
                  <select
                    className="modal-input"
                    value={paperType}
                    onChange={(e) => setPaperType(e.target.value)}
                  >
                    <option value="">Select Paper</option>
                    {shopOptions.paper_types.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="modal-label">Color Mode *</label>
                  <select
                    className="modal-input"
                    value={colorMode}
                    onChange={(e) => setColorMode(e.target.value)}
                  >
                    <option value="">Select Mode</option>
                    {shopOptions.color_modes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="modal-label">Finish Type *</label>
                  <select
                    className="modal-input"
                    value={finishType}
                    onChange={(e) => setFinishType(e.target.value)}
                  >
                    <option value="">Select Finish</option>
                    {shopOptions.finish_types.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="modal-label">Orientation *</label>
                  <select
                    className="modal-input"
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value)}
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="modal-label">Copies *</label>
                  <input
                    className="modal-input"
                    type="number"
                    min={1}
                    value={copies}
                    onChange={(e) => setCopies(Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
  <label className="modal-label">Print Side *</label>

  <div className="print-side-toggle">
    <button
      type="button"
      className={printSide === "single" ? "primary-btn-n" : "cancel-btn1"}
      onClick={() => setPrintSide("single")}
    >
      Single Side
    </button>

    <button
      type="button"
      className={printSide === "double" ? "primary-btn-n" : "cancel-btn1"}
      onClick={() => setPrintSide("double")}
    >
      Double Side
    </button>
  </div>
</div>
              </div>
            )}

            {/* STEP 2 */}
            {currentStep === 2 && (
              <div className="step-form">
                <h3 className="step-title">Upload & Pickup</h3>

                <div className="form-group full-width">
                  <label className="modal-label">Upload File *</label>
                  <label className="upload-box">
                    <span onClick={() => selectedFile && setShowPreview(true)}>
                      {selectedFile ? selectedFile.name : "Choose a File"}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                     onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;

                      const MAX_SIZE = 10 * 1024 * 1024;
                      const ext = file.name.split(".").pop().toLowerCase();

                      const extToMime = {
                        jpg: "image/jpeg",
                        jpeg: "image/jpeg",
                        png: "image/png",
                        pdf: "application/pdf",
                        doc: "application/msword",
                        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                      };

                      let finalType = file.type;

                      if (!finalType || finalType === "application/octet-stream") {
                        finalType = extToMime[ext];
                      }

                      if (!finalType) {
                        setFileError("Unsupported file type.");
                        setSelectedFile(null);
                        return;
                      }

                      if (file.size > MAX_SIZE) {
                        setFileError("File must be under 10MB.");
                        setSelectedFile(null);
                        return;
                      }

                      setFileError("");

                      try {
                        let processedFile = new File([file], file.name, { type: finalType });

                        // ✅ ONLY place where conversion happens
                        if (finalType.includes("wordprocessingml") || finalType === "application/msword") {
                          setShowConverter(true);
                          setSelectedFile(null);
                          setLoaderText("Converting DOCX to PDF…");

                          processedFile = await convertToPDF(processedFile);
                        }

                        setSelectedFile(processedFile);

                        let pages = 1;

                        if (processedFile.type === "application/pdf") {
                          pages = await getPdfPageCount(processedFile);
                        } else if (processedFile.type.startsWith("image/")) {
                          // Images = 1 page by default
                          pages = 1;
                        }

                        setPageCount(pages);

                      } catch (err) {
                        console.error(err);
                        setFileError("File processing failed");
                        setSelectedFile(null);
                      } finally {
                        setShowConverter(false);
                      }
                    }}
                    />
                  </label>
                  {selectedFile && (
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => setShowPreview(true)}
                    >
                      Preview File
                    </button>
                  )}
                  {selectedFile?.type.startsWith("image/") && (
                    <p className="muted">This file will be printed as 1 page.</p>
                  )}
                  {fileError && <p className="error-text">{fileError}</p>}
                </div>

                <div className="form-group full-width">
  <label className="modal-label">Select Pickup Day *</label>

  <div className="day-toggle">
    <button
      type="button"
      className={selectedDay === "today" ? "day-btn active" : "day-btn"}
      onClick={() => {
        setSelectedDay("today");
        setSelectedTime(null);
      }}
    >
      Today
    </button>

    <button
  type="button"
  className={selectedDay === "tomorrow" ? "day-btn active" : "day-btn"}
  onClick={() => {

    if (!hasShopClosedToday()) {
      setDayError(
        `Tomorrow orders can be placed after ${shop.close_time.slice(0,5)}`
      );
      return;
    }

    setDayError("");
    setSelectedDay("tomorrow");
    setSelectedTime(null);
  }}
>
  Tomorrow (+₹{HANDLING_FEE})
</button>
  </div>
  {dayError && (
  <p className="error-text">{dayError}</p>
)}
</div>

<div className="form-group full-width">
  <label className="modal-label">Select Time *</label>

  <div className="time-grid">
    {generateTimeSlots().map((slot, index) => (
      <button
        key={index}
        type="button"
        className={
          selectedTime?.label === slot.label
            ? "time-slot active"
            : "time-slot"
        }
        onClick={() => setSelectedTime(slot)}
      >
        {slot.label}
      </button>
    ))}
  </div>

  {generateTimeSlots().length === 0 && (
    <p className="error-text">No pickup slots available</p>
  )}
</div>


                <div className="form-group">
                 {isHandled && (
  <div className="summary-row">
    <span>Next-Day Handling Fee</span>
    <span>+₹{HANDLING_FEE}</span>
  </div>
  
)}
                </div>

                <div className="form-group full-width">
                  <label className="modal-label">
                    Additional Instructions
                  </label>
                  <textarea
                    className="modal-input"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* STEP 3 (UNCHANGED LOGIC) */}
            {currentStep === 3 && (
              <div className="step-form">
                <h3 className="step-title">Review Order</h3>

                <div className="review-section">
                  <div className="review-item">
                    <span>Paper</span>
                    <span>{selectedPaper?.name}</span>
                  </div>
                  <div className="review-item">
                    <span>Pages</span>
                    <span>{pageCount}</span>
                  </div>
                  <div className="review-item">
                    <span>Copies</span>
                    <span>{copies}</span>
                  </div>
                  <div className="review-item">
                    <span>Pickup</span>
                    <span>{new Date(pickupAt).toLocaleString()}</span>
                  </div>
                </div>
                <div className="policy-agreement-box">
 <label className="policy-checkbox-inline">
  <input
    type="checkbox"
    checked={agreedPolicies}
    onChange={(e) => setAgreedPolicies(e.target.checked)}
  />
  <span className="custom-checkbox"></span>

  <span className="label-text">
    I agree to the{" "}
    <button
      type="button"
      className="policy-link-btn"
      onClick={() => setShowPoliciesModal(true)}
    >
      terms & conditions
    </button>
  </span>
</label>
</div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDE SUMMARY */}
        <div className="create-right">
          <div className="summary-card-S">
            <h3>Order Summary</h3>

            {selectedPaper && (
  <>
    <div className="summary-row">
      <span>Document Price</span>
      <span>₹{documentPrice}</span>
    </div>

    {isHandled && (
      <div className="summary-row">
        <span>Handling Fee</span>
        <span>+₹{HANDLING_FEE}</span>
      </div>
    )}

    <div className="summary-row">
      <span>Platform Fee</span>
      <span>+₹{platformFee}</span>
    </div>
    <div className="summary-row">
      <span>Page Count</span>
      <span>{pageCount}</span>
    </div>
    <div className="summary-row">
  <span>Print Type</span>
  <span>{printSide === "double" ? "Double Side" : "Single Side"}</span>
    </div>

    {/* Optional: slab hint (VERY GOOD UX) */}
    <div style={{ fontSize: "0.75rem", color: "#6F6F6F", marginTop: "4px" }}>
      Applied based on document price slab
    </div>

    <div className="summary-divider" />

    <div className="summary-total">
      <span>Total</span>
      <span>₹{totalPrice}</span>
    </div>
  </>
)}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="create-footer-A">
        {currentStep > 1 && (
          <button
            className="secondary-btn"
            onClick={() => setCurrentStep(currentStep - 1)}
          >
            Back
          </button>
        )}

        {currentStep < 3 ? (
          <button
            className="primary-btn-n"
            disabled={
              (currentStep === 1 && !canProceedStep1) ||
              (currentStep === 2 && !canProceedStep2)
            }
            onClick={() => setCurrentStep(currentStep + 1)}
          >
            Next
          </button>
        ) : (
          <button
          className={`primary-btn-n ${!canSubmit ? "disabled" : ""}`}
          disabled={!canSubmit || shopNotAcceptingOrders}
          onClick={handleSubmitAndPay}
        >
          Submit & Pay
        </button>
        )}

        <button
          className="cancel-btn1"
          onClick={() => {
            setFlowStage(2);
            navigate(`/student/shop/${shopId}`);
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
);

};

export default CreateOrderPage;