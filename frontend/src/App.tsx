import { BrowserRouter, Route, Routes } from 'react-router';
import MainLayout from './layout/MainLayout';
import HomePage from './pages/Home';
import LoginPage from './pages/Login';
import RegisterCustomerPage from './pages/RegisterCustomer';
import RegisterFarmerPage from './pages/RegisterFarmer';
import ForgotPasswordPage from './pages/ForgotPassword';
import ResetPasswordPage from './pages/ResetPassword';
import CustomerDashboardPage from './pages/CustomerDashboard';
import CustomerAccountPage from './pages/CustomerAccount';
import CustomerCartPage from './pages/CustomerCart';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register/customer" element={<RegisterCustomerPage />} />
          <Route path="register/farmer" element={<RegisterFarmerPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Signed-in Customer shell: same SiteHeader, "customer" variant (README, "Two shells"). */}
        <Route element={<MainLayout variant="customer" userName="Khang" cartCount={2} unreadCount={2} />}>
          <Route path="dashboard" element={<CustomerDashboardPage />} />
          <Route path="account" element={<CustomerAccountPage />} />
          <Route path="cart" element={<CustomerCartPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
