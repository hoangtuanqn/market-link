import { BrowserRouter, Route, Routes } from 'react-router';
import MainLayout from './layout/MainLayout';
import HomePage from './pages/Home';
import LoginPage from './pages/Login';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
