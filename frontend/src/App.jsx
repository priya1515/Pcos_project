import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
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

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/new-scan" element={<NewScan />} />
            <Route path="/history" element={<History />} />
            <Route path="/history/:scanId" element={<ScanDetailsPage />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/federation" element={<Federation />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/help" element={<Help />} />
          </Route>
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
