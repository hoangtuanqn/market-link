import { BrowserRouter, Route, Routes } from 'react-router';
import MainLayout from './layout/MainLayout';
import HomePage from './pages/Home';
import LoginPage from './pages/Login';
import RegisterCustomerPage from './pages/RegisterCustomer';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register-customer" element={<RegisterCustomerPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
