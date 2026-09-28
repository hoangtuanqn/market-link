import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import AppToaster from './components/AppToaster';
import CookieConsentBar from './components/CookieConsentBar';
import PlatformStatusSync from './components/PlatformStatusSync';
import AccountDeactivatedDialog from './components/AccountDeactivatedDialog';
import StallSuspendedDialog from './components/StallSuspendedDialog';
import ScrollToTop from './components/ScrollToTop';
import ChatUnreadCenter from './components/chat/ChatUnreadCenter';
import { USER_ROLE } from './constants/enums';
import usePlatformStatus from './hooks/usePlatformStatus';
import useSession from './hooks/useSession';
import NotificationCenter from './components/notifications/NotificationCenter';
import NotificationPermissionBanner from './components/notifications/NotificationPermissionBanner';
import SettingsSync from './components/SettingsSync';
import MaintenancePage from './pages/public/Maintenance';
import AdminLayout from './layout/AdminLayout';
import AdminSettingsPage from './pages/admin/Settings';
import FarmerSettingsPage from './pages/farmer/Settings';
import AuthLayout from './layout/AuthLayout';
import FarmerLayout from './layout/FarmerLayout';
import MainLayout from './layout/MainLayout';
import RequireAuth from './layout/RequireAuth';
import HomePage from './pages/public/Home';
import NotFoundPage from './pages/public/NotFound';
import ForbiddenPage from './pages/public/Forbidden';
import RemountOnParam from './components/RemountOnParam';
import LoginPage from './pages/auth/Login';
import RegisterCustomerPage from './pages/auth/RegisterCustomer';
import VerifyEmailPage from './pages/auth/VerifyEmail';
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
import DealsPage from './pages/public/Deals';
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
import AdminLoginPage from './pages/admin/Login';
import AdminHomePage from './pages/admin/Home';
import AdminVerifyPage from './pages/admin/Verify';
import AdminSetup2FAPage from './pages/admin/Setup2FA';
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
import AdminReportsPage from './pages/admin/Reports';

/**
 * Site-wide maintenance mode (MaintenanceModeFilter is the real gate; this is the UX on top of it): while it is on,
 * anyone but a signed-in admin gets the notice instead of whatever path they asked for. The admin area itself (login
 * included, since a fresh browser has no session yet) stays reachable so an admin can always get in to turn it back
 * off.
 */
const AppRoutes = () => {
  const { user } = useSession();
  const maintenanceMode = usePlatformStatus();
  const location = useLocation();

  const isAdminArea = location.pathname.startsWith('/admin');
  if (maintenanceMode && user?.role !== USER_ROLE.ADMIN && !isAdminArea) {
    return <MaintenancePage />;
  }

  return (
    <>
      <ScrollToTop />
      <SettingsSync>
        <Routes>
          {/* Public informational pages (Guest shell: Header with guest actions + Footer) */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />
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
            <Route path="deals" element={<DealsPage />} />
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

          {/* Authentication flow pages (Focused Auth shell: Logo + page content, no Header/Footer) */}
          <Route element={<AuthLayout />}>
            <Route path="login" element={<LoginPage />} />
            <Route path="register/customer" element={<RegisterCustomerPage />} />
            {/* FR-009: the 6-digit code mailed at sign-up */}
            <Route path="register/verify" element={<VerifyEmailPage />} />
            {/* FR-002: no separate stall sign-up — create a customer account first, then submit the Farmer application at /become-farmer */}
            <Route path="register/farmer" element={<Navigate to="/become-farmer" replace />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />
            <Route path="auth/google/callback" element={<GoogleCallbackPage />} />
            <Route path="auth/complete-profile" element={<CompleteProfilePage />} />
            <Route path="auth/set-password" element={<SetPasswordPage />} />
            <Route element={<RequireAuth />}>
              <Route path="account/password" element={<ChangePasswordPage />} />
            </Route>
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

          {/* Standalone error screens (403 Forbidden and 404 Not Found) with no Header and Footer */}
          <Route path="403" element={<ForbiddenPage />} />
          <Route path="*" element={<NotFoundPage />} />

          {/* Farmer dashboard shell: board-green sidebar, separate from the guest/customer SiteHeader.
              FR-005: signed-in Farmers only — guests go to /login, other roles to their own home. */}
          <Route element={<RequireAuth role={USER_ROLE.FARMER} />}>
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
            </Route>
          </Route>

          {/* FR-004: the admin area is separate from the Customer/Farmer layout. */}
          <Route path="admin/login" element={<AdminLoginPage />} />
          {/* FR-008: step 2 of admin sign-in, no session yet so it sits outside AdminLayout. */}
          <Route path="admin/verify" element={<AdminVerifyPage />} />
          {/* FR-008: mandatory first-time 2FA setup. Has a real session already (issued at login), but sits
              outside AdminLayout so its own guard (not setupRequired) never fights AdminLayout's redirect here. */}
          <Route path="admin/setup-2fa" element={<AdminSetup2FAPage />} />
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

            {/* FR-075 + FR-070: reports and platform-wide orders (admin is read-only, D-04) */}
            <Route path="reports" element={<AdminReportsPage />} />
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

            {/* FR-073: `new` goes before `:id` so it is not caught by mistake as an id */}
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

            {/* FR-074, FR-077, FR-081 and categories / units */}
            <Route path="moderation" element={<AdminModerationPage />} />
            <Route path="categories" element={<AdminCategoriesPage />} />
            <Route path="announcements" element={<AdminAnnouncementsPage />} />
            <Route path="notifications" element={<AdminNotificationsPage />} />
            <Route path="feedback" element={<AdminFeedbackPage />} />

            {/* An admin path that matches nothing → 404 right inside the admin frame */}
            <Route path="*" element={<NotFoundPage standalone={false} />} />
          </Route>
        </Routes>
      </SettingsSync>
      <AppToaster />
      <NotificationCenter />
      <ChatUnreadCenter />
      <NotificationPermissionBanner />
      <CookieConsentBar />
    </>
  );
};

const App = () => (
  <BrowserRouter>
    <PlatformStatusSync />
    <AccountDeactivatedDialog />
    <StallSuspendedDialog />
    <AppRoutes />
  </BrowserRouter>
);

export default App;
