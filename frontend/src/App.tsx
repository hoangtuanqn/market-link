import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import AppToaster from './components/AppToaster';
import NotificationCenter from './components/notifications/NotificationCenter';
import NotificationPermissionBanner from './components/notifications/NotificationPermissionBanner';
import SettingsSync from './components/SettingsSync';
import AdminLayout from './layout/AdminLayout';
import AdminSettingsPage from './pages/admin/Settings';
import FarmerSettingsPage from './pages/farmer/Settings';
import FarmerLayout from './layout/FarmerLayout';
import MainLayout from './layout/MainLayout';
import RequireAuth from './layout/RequireAuth';
import HomePage from './pages/public/Home';
import NotFoundPage from './pages/public/NotFound';
import RemountOnParam from './components/RemountOnParam';
import LoginPage from './pages/auth/Login';
import RegisterCustomerPage from './pages/auth/RegisterCustomer';
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
import ChangePasswordPage from './pages/customer/ChangePassword';
import CustomerSettingsPage from './pages/customer/Settings';
import CustomerAssistantPage from './pages/customer/Assistant';
import MarketsPage from './pages/public/Markets';
import MarketDetailPage from './pages/public/MarketDetail';
import ProductsPage from './pages/public/Products';
import ProductDetailPage from './pages/public/ProductDetail';
import StallProfilePage from './pages/public/StallProfile';
import SearchPage from './pages/public/Search';
import MarketMapPage from './pages/public/MarketMap';
import AboutPage from './pages/public/About';
import PrivacyPage from './pages/public/Privacy';
import TermsPage from './pages/public/Terms';
import ContactPage from './pages/public/Contact';
import FeedbackPage from './pages/public/Feedback';
import FarmerOverviewPage from './pages/farmer/Overview';
import FarmerOrdersPage from './pages/farmer/Orders';
import FarmerOrderDetailPage from './pages/farmer/OrderDetail';
import FarmerStockWeekPage from './pages/farmer/StockWeek';
import FarmerProductsPage from './pages/farmer/Products';
import FarmerProductFormPage from './pages/farmer/ProductForm';
import FarmerStallProfilePage from './pages/farmer/StallProfile';
import FarmerSlotsPage from './pages/farmer/Slots';
import FarmerHistoryPage from './pages/farmer/History';
import FarmerReviewsPage from './pages/farmer/Reviews';
import FarmerMessagesPage from './pages/farmer/Messages';
import FarmerNotificationsPage from './pages/farmer/Notifications';
import FarmerPendingPage from './pages/farmer/Pending';
import FarmerPromotePage from './pages/farmer/Promote';
import AdminLoginPage from './pages/admin/Login';
import AdminHomePage from './pages/admin/Home';
import AdminVerifyPage from './pages/admin/Verify';
import AdminSecurityPage from './pages/admin/Security';
import AdminFarmersPage from './pages/admin/Farmers';
import AdminFarmerDetailPage from './pages/admin/FarmerDetail';
import AdminAccountPage from './pages/admin/Account';
import AdminAnnouncementsPage from './pages/admin/Announcements';
import AdminNotificationsPage from './pages/admin/Notifications';
import AdminCategoriesPage from './pages/admin/Categories';
import AdminCustomerDetailPage from './pages/admin/CustomerDetail';
import AdminCustomersPage from './pages/admin/Customers';
import AdminFeedbackPage from './pages/admin/Feedback';
import AdminMarketFormPage from './pages/admin/MarketForm';
import AdminMarketsPage from './pages/admin/Markets';
import AdminModerationPage from './pages/admin/Moderation';
import AdminOrderDetailPage from './pages/admin/OrderDetail';
import AdminOrdersPage from './pages/admin/Orders';
import AdminPricingPage from './pages/admin/Pricing';
import AdminReportsPage from './pages/admin/Reports';
import AdminRevenuePage from './pages/admin/Revenue';

const App = () => {
  return (
    <BrowserRouter>
      <SettingsSync>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register/customer" element={<RegisterCustomerPage />} />
            {/* FR-002: không đăng ký sạp riêng — tạo tài khoản customer trước, rồi nộp đơn Farmer ở /become-farmer */}
            <Route path="register/farmer" element={<Navigate to="/become-farmer" replace />} />
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
            <Route path="map" element={<MarketMapPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="terms" element={<TermsPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="feedback" element={<FeedbackPage />} />
          </Route>

          {/* Signed-in Customer shell: same SiteHeader, "customer" variant (README, "Two shells"). */}
          <Route element={<MainLayout />}>
            <Route element={<RequireAuth />}>
              <Route path="dashboard" element={<CustomerDashboardPage />} />
              <Route path="account" element={<CustomerAccountPage />} />
              <Route path="account/password" element={<ChangePasswordPage />} />
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
            <Route path="settings" element={<FarmerSettingsPage />} />
            <Route path="reviews" element={<FarmerReviewsPage />} />
            <Route path="messages" element={<FarmerMessagesPage />} />
            <Route path="notifications" element={<FarmerNotificationsPage />} />
            <Route path="pending" element={<FarmerPendingPage />} />
            <Route path="promote" element={<FarmerPromotePage />} />
          </Route>

          {/* FR-004: khu admin tách khỏi layout Customer/Farmer. */}
          <Route path="admin/login" element={<AdminLoginPage />} />
          {/* FR-008: bước 2 đăng nhập admin, chưa có phiên nên nằm ngoài AdminLayout. */}
          <Route path="admin/verify" element={<AdminVerifyPage />} />
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<AdminHomePage />} />
            <Route path="security" element={<AdminSecurityPage />} />
            <Route path="farmers" element={<AdminFarmersPage />} />
            <Route
              path="farmers/:id"
              element={
                <RemountOnParam param="id">
                  <AdminFarmerDetailPage />
                </RemountOnParam>
              }
            />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="account" element={<AdminAccountPage />} />

            {/* FR-075 + FR-070: báo cáo, doanh thu sàn và đơn hàng toàn sàn (admin chỉ đọc, D-04) */}
            <Route path="reports" element={<AdminReportsPage />} />
            <Route path="revenue" element={<AdminRevenuePage />} />
            <Route path="pricing" element={<AdminPricingPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route
              path="orders/:code"
              element={
                <RemountOnParam param="code">
                  <AdminOrderDetailPage />
                </RemountOnParam>
              }
            />

            {/* FR-072 */}
            <Route path="customers" element={<AdminCustomersPage />} />
            <Route
              path="customers/:id"
              element={
                <RemountOnParam param="id">
                  <AdminCustomerDetailPage />
                </RemountOnParam>
              }
            />

            {/* FR-073: `new` đi trước `:id` để không bị bắt nhầm thành id */}
            <Route path="markets" element={<AdminMarketsPage />} />
            <Route path="markets/new" element={<AdminMarketFormPage />} />
            <Route
              path="markets/:id"
              element={
                <RemountOnParam param="id">
                  <AdminMarketFormPage />
                </RemountOnParam>
              }
            />

            {/* FR-074, FR-077, FR-081 và danh mục / đơn vị */}
            <Route path="moderation" element={<AdminModerationPage />} />
            <Route path="categories" element={<AdminCategoriesPage />} />
            <Route path="announcements" element={<AdminAnnouncementsPage />} />
            <Route path="notifications" element={<AdminNotificationsPage />} />
            <Route path="feedback" element={<AdminFeedbackPage />} />

            {/* Đường dẫn admin không khớp gì → 404 ngay trong khung admin, không rơi ra layout Customer */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </SettingsSync>
      <AppToaster />
      <NotificationCenter />
      <NotificationPermissionBanner />
    </BrowserRouter>
  );
};

export default App;
