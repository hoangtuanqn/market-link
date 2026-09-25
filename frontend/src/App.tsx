import { BrowserRouter, Route, Routes } from 'react-router';
import AppToaster from './components/AppToaster';
import AdminLayout from './layout/AdminLayout';
import FarmerLayout from './layout/FarmerLayout';
import MainLayout from './layout/MainLayout';
import RequireAuth from './layout/RequireAuth';
import HomePage from './pages/Home';
import NotFoundPage from './pages/NotFound';
import RemountOnParam from './components/RemountOnParam';
import LoginPage from './pages/Login';
import RegisterCustomerPage from './pages/RegisterCustomer';
import RegisterFarmerPage from './pages/RegisterFarmer';
import ForgotPasswordPage from './pages/ForgotPassword';
import ResetPasswordPage from './pages/ResetPassword';
import GoogleCallbackPage from './pages/GoogleCallback';
import CompleteProfilePage from './pages/CompleteProfile';
import SetPasswordPage from './pages/SetPassword';
import CustomerDashboardPage from './pages/CustomerDashboard';
import CustomerAccountPage from './pages/CustomerAccount';
import CustomerCartPage from './pages/CustomerCart';
import CustomerOrdersPage from './pages/CustomerOrders';
import CustomerOrderDetailPage from './pages/CustomerOrderDetail';
import CustomerFavoritesPage from './pages/CustomerFavorites';
import CustomerMessagesPage from './pages/CustomerMessages';
import CustomerNotificationsPage from './pages/CustomerNotifications';
import CustomerOrderEditPage from './pages/CustomerOrderEdit';
import CustomerOrderPlacedPage from './pages/CustomerOrderPlaced';
import CustomerReviewPage from './pages/CustomerReview';
import CustomerBecomeFarmerPage from './pages/CustomerBecomeFarmer';
import CustomerSettingsPage from './pages/CustomerSettings';
import CustomerAssistantPage from './pages/CustomerAssistant';
import MarketsPage from './pages/Markets';
import MarketDetailPage from './pages/MarketDetail';
import ProductsPage from './pages/Products';
import ProductDetailPage from './pages/ProductDetail';
import StallProfilePage from './pages/StallProfile';
import SearchPage from './pages/Search';
import FarmerOverviewPage from './pages/FarmerOverview';
import FarmerOrdersPage from './pages/FarmerOrders';
import FarmerOrderDetailPage from './pages/FarmerOrderDetail';
import FarmerStockWeekPage from './pages/FarmerStockWeek';
import FarmerProductsPage from './pages/FarmerProducts';
import FarmerProductFormPage from './pages/FarmerProductForm';
import FarmerStallProfilePage from './pages/FarmerStallProfile';
import FarmerSlotsPage from './pages/FarmerSlots';
import FarmerHistoryPage from './pages/FarmerHistory';
import FarmerReviewsPage from './pages/FarmerReviews';
import FarmerMessagesPage from './pages/FarmerMessages';
import FarmerNotificationsPage from './pages/FarmerNotifications';
import FarmerPendingPage from './pages/FarmerPending';
import AdminLoginPage from './pages/AdminLogin';
import AdminHomePage from './pages/AdminHome';
import AdminVerifyPage from './pages/AdminVerify';
import AdminSecurityPage from './pages/AdminSecurity';

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
          <Route path="auth/google/callback" element={<GoogleCallbackPage />} />
          <Route path="auth/complete-profile" element={<CompleteProfilePage />} />
          <Route path="auth/set-password" element={<SetPasswordPage />} />
          <Route path="markets" element={<MarketsPage />} />
          <Route
            path="markets/:id"
            element={
              <RemountOnParam param="id">
                <MarketDetailPage />
              </RemountOnParam>
            }
          />
          <Route path="products" element={<ProductsPage />} />
          <Route
            path="products/:id"
            element={
              <RemountOnParam param="id">
                <ProductDetailPage />
              </RemountOnParam>
            }
          />
          <Route
            path="stalls/:id"
            element={
              <RemountOnParam param="id">
                <StallProfilePage />
              </RemountOnParam>
            }
          />
          <Route path="search" element={<SearchPage />} />
        </Route>

        {/* Signed-in Customer shell: same SiteHeader, "customer" variant (README, "Two shells"). */}
        <Route element={<MainLayout />}>
          <Route element={<RequireAuth />}>
            <Route path="dashboard" element={<CustomerDashboardPage />} />
            <Route path="account" element={<CustomerAccountPage />} />
            <Route path="cart" element={<CustomerCartPage />} />
            <Route path="orders" element={<CustomerOrdersPage />} />
            <Route
              path="orders/:code"
              element={
                <RemountOnParam param="code">
                  <CustomerOrderDetailPage />
                </RemountOnParam>
              }
            />
            <Route path="favorites" element={<CustomerFavoritesPage />} />
            <Route path="messages" element={<CustomerMessagesPage />} />
            <Route path="notifications" element={<CustomerNotificationsPage />} />
            <Route
              path="orders/:code/edit"
              element={
                <RemountOnParam param="code">
                  <CustomerOrderEditPage />
                </RemountOnParam>
              }
            />
            <Route path="orders/placed" element={<CustomerOrderPlacedPage />} />
            <Route
              path="orders/:code/review"
              element={
                <RemountOnParam param="code">
                  <CustomerReviewPage />
                </RemountOnParam>
              }
            />
            <Route path="become-farmer" element={<CustomerBecomeFarmerPage />} />
            <Route path="settings" element={<CustomerSettingsPage />} />
            <Route path="assistant" element={<CustomerAssistantPage />} />
          </Route>
        </Route>

        {/* Đường dẫn lạ / trang chưa làm (search, map, about…) → 404 thay vì màn hình trắng */}
        <Route element={<MainLayout />}>
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Farmer dashboard shell: board-green sidebar, separate from the guest/customer SiteHeader. */}
        <Route path="/farmer" element={<FarmerLayout />}>
          <Route index element={<FarmerOverviewPage />} />
          <Route path="orders" element={<FarmerOrdersPage />} />
          <Route
            path="orders/:code"
            element={
              <RemountOnParam param="code">
                <FarmerOrderDetailPage />
              </RemountOnParam>
            }
          />
          <Route path="stock" element={<FarmerStockWeekPage />} />
          <Route path="products" element={<FarmerProductsPage />} />
          <Route path="products/new" element={<FarmerProductFormPage />} />
          <Route
            path="products/:id/edit"
            element={
              <RemountOnParam param="id">
                <FarmerProductFormPage />
              </RemountOnParam>
            }
          />
          <Route path="stall" element={<FarmerStallProfilePage />} />
          <Route path="slots" element={<FarmerSlotsPage />} />
          <Route path="history" element={<FarmerHistoryPage />} />
          <Route path="reviews" element={<FarmerReviewsPage />} />
          <Route path="messages" element={<FarmerMessagesPage />} />
          <Route path="notifications" element={<FarmerNotificationsPage />} />
          <Route path="pending" element={<FarmerPendingPage />} />
        </Route>

        {/* FR-004: khu admin tách khỏi layout Customer/Farmer. */}
        <Route path="admin/login" element={<AdminLoginPage />} />
        {/* FR-008: bước 2 đăng nhập admin, chưa có phiên nên nằm ngoài AdminLayout. */}
        <Route path="admin/verify" element={<AdminVerifyPage />} />
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminHomePage />} />
          <Route path="security" element={<AdminSecurityPage />} />
        </Route>
      </Routes>
      <AppToaster />
    </BrowserRouter>
  );
};

export default App;
