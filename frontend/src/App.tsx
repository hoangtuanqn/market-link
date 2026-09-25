import { BrowserRouter, Route, Routes } from 'react-router';
import FarmerLayout from './layout/FarmerLayout';
import MainLayout from './layout/MainLayout';
import HomePage from './pages/Home';
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
          <Route path="markets/:id" element={<MarketDetailPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/:id" element={<ProductDetailPage />} />
          <Route path="stalls/:id" element={<StallProfilePage />} />
          <Route path="search" element={<SearchPage />} />
        </Route>

        {/* Signed-in Customer shell: same SiteHeader, "customer" variant (README, "Two shells"). */}
        <Route element={<MainLayout />}>
          <Route path="dashboard" element={<CustomerDashboardPage />} />
          <Route path="account" element={<CustomerAccountPage />} />
          <Route path="cart" element={<CustomerCartPage />} />
          <Route path="orders" element={<CustomerOrdersPage />} />
          <Route path="orders/:code" element={<CustomerOrderDetailPage />} />
          <Route path="favorites" element={<CustomerFavoritesPage />} />
          <Route path="messages" element={<CustomerMessagesPage />} />
          <Route path="notifications" element={<CustomerNotificationsPage />} />
          <Route path="orders/:code/edit" element={<CustomerOrderEditPage />} />
          <Route path="orders/placed" element={<CustomerOrderPlacedPage />} />
          <Route path="orders/:code/review" element={<CustomerReviewPage />} />
          <Route path="become-farmer" element={<CustomerBecomeFarmerPage />} />
          <Route path="settings" element={<CustomerSettingsPage />} />
          <Route path="assistant" element={<CustomerAssistantPage />} />
        </Route>

        {/* Farmer dashboard shell: board-green sidebar, separate from the guest/customer SiteHeader. */}
        <Route path="/farmer" element={<FarmerLayout />}>
          <Route index element={<FarmerOverviewPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
