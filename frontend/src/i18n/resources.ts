/**
 * English is the source language and ships in the main bundle; its JSON also types every `t()` key (see i18next.d.ts).
 * One namespace per page folder plus `common` for shared components. New page: add `src/locales/<lng>/<Folder>.json`
 * for every language and a line here.
 */
import common from '@/locales/en/common.json';
import adminHome from '@/locales/en/AdminHome.json';
import adminLogin from '@/locales/en/AdminLogin.json';
import adminSecurity from '@/locales/en/AdminSecurity.json';
import adminVerify from '@/locales/en/AdminVerify.json';
import completeProfile from '@/locales/en/CompleteProfile.json';
import customerAccount from '@/locales/en/CustomerAccount.json';
import customerAssistant from '@/locales/en/CustomerAssistant.json';
import customerBecomeFarmer from '@/locales/en/CustomerBecomeFarmer.json';
import customerCart from '@/locales/en/CustomerCart.json';
import customerDashboard from '@/locales/en/CustomerDashboard.json';
import customerFavorites from '@/locales/en/CustomerFavorites.json';
import customerMessages from '@/locales/en/CustomerMessages.json';
import customerNotifications from '@/locales/en/CustomerNotifications.json';
import customerOrderDetail from '@/locales/en/CustomerOrderDetail.json';
import customerOrderEdit from '@/locales/en/CustomerOrderEdit.json';
import customerOrderPlaced from '@/locales/en/CustomerOrderPlaced.json';
import customerOrders from '@/locales/en/CustomerOrders.json';
import customerReview from '@/locales/en/CustomerReview.json';
import customerSettings from '@/locales/en/CustomerSettings.json';
import farmerHistory from '@/locales/en/FarmerHistory.json';
import farmerOrderDetail from '@/locales/en/FarmerOrderDetail.json';
import farmerOrders from '@/locales/en/FarmerOrders.json';
import farmerOverview from '@/locales/en/FarmerOverview.json';
import farmerProductForm from '@/locales/en/FarmerProductForm.json';
import farmerProducts from '@/locales/en/FarmerProducts.json';
import farmerSlots from '@/locales/en/FarmerSlots.json';
import farmerStallProfile from '@/locales/en/FarmerStallProfile.json';
import farmerStockWeek from '@/locales/en/FarmerStockWeek.json';
import forgotPassword from '@/locales/en/ForgotPassword.json';
import googleCallback from '@/locales/en/GoogleCallback.json';
import home from '@/locales/en/Home.json';
import login from '@/locales/en/Login.json';
import marketDetail from '@/locales/en/MarketDetail.json';
import markets from '@/locales/en/Markets.json';
import notFound from '@/locales/en/NotFound.json';
import productDetail from '@/locales/en/ProductDetail.json';
import products from '@/locales/en/Products.json';
import registerCustomer from '@/locales/en/RegisterCustomer.json';
import resetPassword from '@/locales/en/ResetPassword.json';
import search from '@/locales/en/Search.json';
import setPassword from '@/locales/en/SetPassword.json';
import stallProfile from '@/locales/en/StallProfile.json';
import farmerSettings from '@/locales/en/FarmerSettings.json';
import adminSettings from '@/locales/en/AdminSettings.json';
import farmerMessages from '@/locales/en/FarmerMessages.json';
import farmerNotifications from '@/locales/en/FarmerNotifications.json';
import farmerPending from '@/locales/en/FarmerPending.json';
import farmerPromote from '@/locales/en/FarmerPromote.json';
import farmerReviews from '@/locales/en/FarmerReviews.json';
import adminFarmerDetail from '@/locales/en/AdminFarmerDetail.json';
import adminFarmers from '@/locales/en/AdminFarmers.json';
import marketMap from '@/locales/en/MarketMap.json';
import about from '@/locales/en/About.json';

export const en = {
  common: common,
  AdminHome: adminHome,
  AdminLogin: adminLogin,
  AdminSecurity: adminSecurity,
  AdminVerify: adminVerify,
  CompleteProfile: completeProfile,
  CustomerAccount: customerAccount,
  CustomerAssistant: customerAssistant,
  CustomerBecomeFarmer: customerBecomeFarmer,
  CustomerCart: customerCart,
  CustomerDashboard: customerDashboard,
  CustomerFavorites: customerFavorites,
  CustomerMessages: customerMessages,
  CustomerNotifications: customerNotifications,
  CustomerOrderDetail: customerOrderDetail,
  CustomerOrderEdit: customerOrderEdit,
  CustomerOrderPlaced: customerOrderPlaced,
  CustomerOrders: customerOrders,
  CustomerReview: customerReview,
  CustomerSettings: customerSettings,
  FarmerHistory: farmerHistory,
  FarmerOrderDetail: farmerOrderDetail,
  FarmerOrders: farmerOrders,
  FarmerOverview: farmerOverview,
  FarmerProductForm: farmerProductForm,
  FarmerProducts: farmerProducts,
  FarmerSlots: farmerSlots,
  FarmerStallProfile: farmerStallProfile,
  FarmerStockWeek: farmerStockWeek,
  ForgotPassword: forgotPassword,
  GoogleCallback: googleCallback,
  Home: home,
  Login: login,
  MarketDetail: marketDetail,
  Markets: markets,
  NotFound: notFound,
  ProductDetail: productDetail,
  Products: products,
  RegisterCustomer: registerCustomer,
  ResetPassword: resetPassword,
  Search: search,
  SetPassword: setPassword,
  StallProfile: stallProfile,
  FarmerSettings: farmerSettings,
  AdminSettings: adminSettings,
  FarmerMessages: farmerMessages,
  FarmerNotifications: farmerNotifications,
  FarmerPending: farmerPending,
  FarmerPromote: farmerPromote,
  FarmerReviews: farmerReviews,
  AdminFarmers: adminFarmers,
  AdminFarmerDetail: adminFarmerDetail,
  MarketMap: marketMap,
  About: about,
} as const;

export type Namespace = keyof typeof en;
export const NAMESPACES = Object.keys(en) as Namespace[];
