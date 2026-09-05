import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthCheck from "./hooks/useAuthCheck";
import LoginButton from "./components/login/LoginButton.jsx";
import Dashboard from "./components/dashboard/Dashboard.jsx";
import ProductList from "./components/products/ProductList.jsx";
import SavedProducts from "./components/products/SavedProducts.jsx";
import TemplateManager from "./components/templates/TemplateManager.jsx";
import PrivateRoute from "./utils/privateRoutes/PrivateRoutes.js";
import TrackingManager from "./components/tracking/TrackingManager.jsx";
import { MassiveMessagesStatusWrapper } from "./components/tracking/wrapperTracking/WrapperMassiveMessages.jsx";
import Overview from './components/dashboard/Overview.jsx';
import Statistics from './components/statistics/Statistics.jsx';
import Spinner from './components/spinner/Spinner.jsx';
import './App.css';

function App() {
  const { isAuthenticated, isChecking, setIsAuthenticated } = useAuthCheck();

  if (isChecking) {
    return (
      <div className="app-loading-screen" role="status" aria-live="polite">
        <div className="app-loading-screen__brand">Flow Sell</div>
        <Spinner loading size={36} color="#3483fa" />
        <p>Preparando tu espacio de trabajo…</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginButton isAuthenticated={isAuthenticated} />}
      />

      <Route
        path="/app"
        element={
          <PrivateRoute isAuthenticated={isAuthenticated}>
            <Dashboard onLogout={() => setIsAuthenticated(false)} />
          </PrivateRoute>
        }
      >
        <Route index element={<Overview />} />
        <Route path="products" element={<ProductList />} />
        <Route path="automations" element={<SavedProducts />} />
        <Route path="saved" element={<Navigate to="../automations" replace />} />
        <Route path="templates" element={<TemplateManager />} />
        <Route path="campaigns" element={<TrackingManager />} />
        <Route path="tracking" element={<Navigate to="../campaigns" replace />} />
        <Route path="statistics" element={<Statistics />} />
        <Route path="massive-status/:jobId" element={<MassiveMessagesStatusWrapper />} />
      </Route>

      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/app" replace /> : <Navigate to="/login" replace />}
      />
      <Route path="*" element={<Navigate to={isAuthenticated ? '/app' : '/login'} replace />} />
    </Routes>
  );
}
export default App;
