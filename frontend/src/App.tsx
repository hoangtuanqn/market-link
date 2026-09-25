import { BrowserRouter, Route, Routes } from 'react-router';
import AppToaster from './components/AppToaster';
import AdminLayout from './layout/AdminLayout';
import FarmerLayout from './layout/FarmerLayout';
import MainLayout from './layout/MainLayout';
import RequireAuth from './layout/RequireAuth';
import HomePage from './pages/public/Home';
import NotFoundPage from './pages/public/NotFound';
import RemountOnParam from './components/RemountOnParam';
import LoginPage from './pages/auth/Login';
import RegisterCustomerPage from './pages/auth/RegisterCustomer';
import RegisterFarmerPage from './pages/auth/RegisterFarmer';
import ForgotPasswordPage from './pages/auth/ForgotPassword';
import ResetPasswordPage from './pages/auth/ResetPassword';
import GoogleCallbackPage from './pages/auth/GoogleCallback';
import CompleteProfilePage from './pages/auth/CompleteProfile';
import SetPasswordPage from './pages/auth/SetPassword';
import CustomerDashboardPage from './pages/customer/Dashboard';
import CustomerAccountPage from './pages/customer/Account';
import CustomerCartPage from './pages/customer/Cart';
import CustomerOrdersPage from './pages/customer/Orders';
import CustomerOrderDetailPage from './pages/customer/OrderDetail';
import CustomerFavoritesPage from './pages/customer/Favorites';
import CustomerMessagesPage from './pages/customer/Messages';
import CustomerNotificationsPage from './pages/customer/Notifications';
import CustomerOrderEditPage from './pages/customer/OrderEdit';
import CustomerOrderPlacedPage from './pages/customer/OrderPlaced';
import CustomerReviewPage from './pages/customer/Review';
import CustomerBecomeFarmerPage from './pages/customer/BecomeFarmer';
import CustomerSettingsPage from './pages/customer/Settings';
import CustomerAssistantPage from './pages/customer/Assistant';
import MarketsPage from './pages/public/Markets';
import MarketDetailPage from './pages/public/MarketDetail';
import ProductsPage from './pages/public/Products';
import ProductDetailPage from './pages/public/ProductDetail';
import StallProfilePage from './pages/public/StallProfile';
import SearchPage from './pages/public/Search';
import FarmerOverviewPage from './pages/farmer/Overview';
import FarmerOrdersPage from './pages/farmer/Orders';
import FarmerOrderDetailPage from './pages/farmer/OrderDetail';
import FarmerStockWeekPage from './pages/farmer/StockWeek';
import FarmerProductsPage from './pages/farmer/Products';
import FarmerProductFormPage from './pages/farmer/ProductForm';
import FarmerStallProfilePage from './pages/farmer/StallProfile';
import FarmerSlotsPage from './pages/farmer/Slots';
import AdminLoginPage from './pages/admin/Login';
import AdminHomePage from './pages/admin/Home';
import AdminVerifyPage from './pages/admin/Verify';
import AdminSecurityPage from './pages/admin/Security';

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
