import { Routes, Route } from "react-router-dom";

import Home from "../pages/Home";
import Login from "../components/auth/Login";
import Signup from "../components/auth/Signup";

import StudentLayout from "../components/student/layout/StudentLayout";
import StudentHome from "../components/student/pages/StudentHome";
import ShopDetails from "../components/student/pages/ShopDetails";
import StudentOrders from "../components/student/pages/StudentOrders";
import ProtectedRoute from "./ProtectedRoute";
import ShopDashboard from "../components/shop/ShopDashboard";
import StudentProfile from "../components/student/pages/StudentProfile";
import ForgotPassword from "../components/auth/ForgotPassword";
import ResetPassword from "../components/auth/ResetPassword";
import AdminDashboard from "../components/admin/AdminDashboard";
import { StudentDataProvider } from "../components/student/context/StudentDataContext";
import CreateOrderPage from "../components/student/modals/CreateOrderPage";
import WalkInOrderPage from "../components/student/modals/WalkInOrderPage";
import NotFound from "../pages/NotFound";
import EmailVerified from "../components/auth/EmailVerified";
import AcceptInvite from "../components/auth/AcceptInvite";
const AppRoutes = () => {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/update-password" element={<ResetPassword />} />

      {/* Student (Protected) */}
      <Route element={<ProtectedRoute role="student" />}>
        <Route path="/student"  element={
    <StudentDataProvider>
      <StudentLayout />
    </StudentDataProvider>
  }>
          <Route index element={<StudentHome />} />
          <Route path="shop/:shopId" element={<ShopDetails />} />
          <Route path="orders" element={<StudentOrders />} />
          <Route path="shop/:shopId/create" element={<CreateOrderPage />} />
          <Route path="shop/:shopId/walk-in" element={<WalkInOrderPage />} />
          <Route path="profile" element={<StudentProfile />} />
        </Route>
      </Route>

      {/* Shop */}
      <Route element={<ProtectedRoute role="shop" />}>
        <Route path="/shop" element={<ShopDashboard />} />
      </Route>
      {/* Admin */}
      <Route element={<ProtectedRoute role="admin" />}>
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>
      <Route path="/email-verified" element={<EmailVerified />} />
      <Route
        path="/accept-invite"
        element={<AcceptInvite />}
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
