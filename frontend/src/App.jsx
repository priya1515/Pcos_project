import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import NewScan from "./pages/NewScan";
import History from "./pages/History";
import ScanDetailsPage from "./pages/ScanDetailsPage";
import Compare from "./pages/Compare";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Federation from "./pages/Federation";
import Help from "./pages/Help";
import Login from "./pages/Login";
import { useAppContext } from "./context/useAppContext";

function RequireAuth() {
  const { isAuthenticated } = useAppContext();
  const location = useLocation();

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}

function RequireAdmin() {
  const { user } = useAppContext();

  return user?.role === "admin" ? <Outlet /> : <Navigate to="/" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route path="/new-scan" element={<NewScan />} />
              <Route path="/history" element={<History />} />
              <Route path="/history/:scanId" element={<ScanDetailsPage />} />
              <Route path="/compare" element={<Compare />} />
              <Route path="/reports" element={<Reports />} />
              <Route element={<RequireAdmin />}>
                <Route path="/federation" element={<Federation />} />
              </Route>
              <Route path="/settings" element={<Settings />} />
              <Route path="/help" element={<Help />} />
            </Route>
          </Route>
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
