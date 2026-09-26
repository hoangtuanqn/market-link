import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import AppToaster from './components/AppToaster';
import ChatUnreadCenter from './components/chat/ChatUnreadCenter';
import ComingSoon from './components/ComingSoon';
import { SHOW_WIP } from './config/wip';
import { USER_ROLE } from './constants/enums';
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
import CustomerDashboardWip from './pages/customer/Dashboard';
import CustomerAccountPage from './pages/customer/Account';
import CustomerCartWip from './pages/customer/Cart';
import CustomerOrdersWip from './pages/customer/Orders';
import CustomerOrderDetailWip from './pages/customer/OrderDetail';
import CustomerFavoritesWip from './pages/customer/Favorites';
import CustomerMessagesPage from './pages/customer/Messages';
import CustomerNotificationsPage from './pages/customer/Notifications';
import CustomerOrderEditWip from './pages/customer/OrderEdit';
import CustomerOrderPlacedWip from './pages/customer/OrderPlaced';
import CustomerReviewWip from './pages/customer/Review';
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
import FeedbackWip from './pages/public/Feedback';
import FarmerOverviewWip from './pages/farmer/Overview';
import FarmerOrdersWip from './pages/farmer/Orders';
import FarmerOrderDetailWip from './pages/farmer/OrderDetail';
import FarmerStockWeekWip from './pages/farmer/StockWeek';
import FarmerProductsPage from './pages/farmer/Products';
import FarmerProductFormPage from './pages/farmer/ProductForm';
import FarmerStallProfilePage from './pages/farmer/StallProfile';
import FarmerSlotsWip from './pages/farmer/Slots';
import FarmerHistoryWip from './pages/farmer/History';
import FarmerReviewsWip from './pages/farmer/Reviews';
import FarmerMessagesPage from './pages/farmer/Messages';
import FarmerNotificationsPage from './pages/farmer/Notifications';
import FarmerPendingWip from './pages/farmer/Pending';
import FarmerPromoteWip from './pages/farmer/Promote';
import AdminLoginPage from './pages/admin/Login';
import AdminHomeWip from './pages/admin/Home';
import AdminVerifyPage from './pages/admin/Verify';
import AdminSecurityPage from './pages/admin/Security';
import AdminFarmersPage from './pages/admin/Farmers';
import AdminFarmerDetailPage from './pages/admin/FarmerDetail';
import AdminAccountPage from './pages/admin/Account';
import AdminAnnouncementsPage from './pages/admin/Announcements';
import AdminNotificationsPage from './pages/admin/Notifications';
import AdminCategoriesPage from './pages/admin/Categories';
import AdminCustomerDetailWip from './pages/admin/CustomerDetail';
import AdminCustomersWip from './pages/admin/Customers';
import AdminFeedbackWip from './pages/admin/Feedback';
import AdminMarketFormPage from './pages/admin/MarketForm';
import AdminMarketsPage from './pages/admin/Markets';
import AdminModerationPage from './pages/admin/Moderation';
import AdminOrderDetailWip from './pages/admin/OrderDetail';
import AdminOrdersWip from './pages/admin/Orders';
import AdminPricingWip from './pages/admin/Pricing';
import AdminReportsWip from './pages/admin/Reports';
import AdminRevenueWip from './pages/admin/Revenue';

// A screen still running on sample data (src/data): the production build shows "Coming soon" instead (config/wip.ts).
// Once a screen's API is wired up, remove it from this list.
const CustomerDashboardPage = SHOW_WIP ? CustomerDashboardWip : ComingSoon;
const CustomerOrdersPage = SHOW_WIP ? CustomerOrdersWip : ComingSoon;
const CustomerOrderDetailPage = SHOW_WIP ? CustomerOrderDetailWip : ComingSoon;
const CustomerFavoritesPage = SHOW_WIP ? CustomerFavoritesWip : ComingSoon;
const CustomerOrderEditPage = SHOW_WIP ? CustomerOrderEditWip : ComingSoon;
const CustomerOrderPlacedPage = SHOW_WIP ? CustomerOrderPlacedWip : ComingSoon;
const CustomerReviewPage = SHOW_WIP ? CustomerReviewWip : ComingSoon;
const FarmerOverviewPage = SHOW_WIP ? FarmerOverviewWip : ComingSoon;
const FarmerOrdersPage = SHOW_WIP ? FarmerOrdersWip : ComingSoon;
const FarmerOrderDetailPage = SHOW_WIP ? FarmerOrderDetailWip : ComingSoon;
const FarmerStockWeekPage = SHOW_WIP ? FarmerStockWeekWip : ComingSoon;
const FarmerSlotsPage = SHOW_WIP ? FarmerSlotsWip : ComingSoon;
const FarmerHistoryPage = SHOW_WIP ? FarmerHistoryWip : ComingSoon;
const FarmerReviewsPage = SHOW_WIP ? FarmerReviewsWip : ComingSoon;
const FarmerPendingPage = SHOW_WIP ? FarmerPendingWip : ComingSoon;
const FarmerPromotePage = SHOW_WIP ? FarmerPromoteWip : ComingSoon;
const AdminHomePage = SHOW_WIP ? AdminHomeWip : ComingSoon;
const AdminReportsPage = SHOW_WIP ? AdminReportsWip : ComingSoon;
const AdminRevenuePage = SHOW_WIP ? AdminRevenueWip : ComingSoon;
const AdminPricingPage = SHOW_WIP ? AdminPricingWip : ComingSoon;
const AdminOrdersPage = SHOW_WIP ? AdminOrdersWip : ComingSoon;
const AdminOrderDetailPage = SHOW_WIP ? AdminOrderDetailWip : ComingSoon;
const AdminCustomersPage = SHOW_WIP ? AdminCustomersWip : ComingSoon;
const AdminCustomerDetailPage = SHOW_WIP ? AdminCustomerDetailWip : ComingSoon;
const AdminFeedbackPage = SHOW_WIP ? AdminFeedbackWip : ComingSoon;
const FeedbackPage = SHOW_WIP ? FeedbackWip : ComingSoon;
const CustomerCartPage = SHOW_WIP ? CustomerCartWip : ComingSoon;

const App = () => {
  return (
    <BrowserRouter>
      <SettingsSync>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register/customer" element={<RegisterCustomerPage />} />
            {/* FR-002: no separate stall sign-up — create a customer account first, then submit the Farmer application at /become-farmer */}
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

          {/* An unknown path / an unbuilt page (search, map, about…) → 404 instead of a blank screen */}
          <Route element={<MainLayout />}>
            <Route path="*" element={<NotFoundPage />} />
          </Route>

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
              <Route path="promote" element={<FarmerPromotePage />} />
            </Route>
          </Route>

          {/* FR-004: the admin area is separate from the Customer/Farmer layout. */}
          <Route path="admin/login" element={<AdminLoginPage />} />
          {/* FR-008: step 2 of admin sign-in, no session yet so it sits outside AdminLayout. */}
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

            {/* FR-075 + FR-070: reports, platform revenue and platform-wide orders (admin is read-only, D-04) */}
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

            {/* An admin path that matches nothing → 404 right inside the admin frame, not falling out to the Customer layout */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </SettingsSync>
      <AppToaster />
      <NotificationCenter />
      <ChatUnreadCenter />
      <NotificationPermissionBanner />
    </BrowserRouter>
  );
};

export default App;
