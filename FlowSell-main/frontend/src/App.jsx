import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthCheck from "./hooks/useAuthCheck";
import LoginButton from "./components/login/Landing.jsx";
import Dashboard from "./components/dashboard/Dashboard.jsx";
import ProductList from "./components/products/ProductList.jsx";
import SavedProducts from "./components/products/SavedProducts.jsx";
import TemplateManager from "./components/templates/TemplateManager.jsx";
import PrivateRoute from "./utils/privateRoutes/PrivateRoutes.jsx";
import TrackingManager from "./components/tracking/TrackingManager.jsx";
import { MassiveMessagesStatusWrapper } from "./components/tracking/wrapperTracking/WrapperMassiveMessages.jsx";
import Overview from './components/dashboard/Overview.jsx';
import Statistics from './components/statistics/Statistics.jsx';
import Spinner from './components/spinner/Spinner.jsx';
import './App.css';
import './security-release.css';
import {AccountProvider,PublicConfigProvider,PlanGate} from './components/account/AccountContext.jsx';
import Plans from './components/account/Plans.jsx';
import Account from './components/account/Account.jsx';
import Guide from './components/account/Guide.jsx';
import Admin from './components/account/Admin.jsx';
import Legal from './components/account/Legal.jsx';

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
    <PublicConfigProvider><Routes>
      <Route path="/privacy" element={<Legal/>}/>
      <Route path="/terms" element={<Legal kind="terms"/>}/>
      <Route path="/guide" element={<Guide publicPage/>}/>
      <Route
        path="/login"
        element={<LoginButton isAuthenticated={isAuthenticated} />}
      />

      <Route
        path="/app"
        element={
          <PrivateRoute isAuthenticated={isAuthenticated}>
            <AccountProvider><Dashboard onLogout={() => setIsAuthenticated(false)} /></AccountProvider>
          </PrivateRoute>
        }
      >
        <Route index element={<Overview />} />
        <Route path="products" element={<ProductList />} />
        <Route path="automations" element={<SavedProducts />} />
        <Route path="saved" element={<Navigate to="../automations" replace />} />
        <Route path="templates" element={<TemplateManager />} />
        <Route path="campaigns" element={<PlanGate feature="campaigns"><TrackingManager /></PlanGate>} />
        <Route path="plans" element={<Plans/>}/>
        <Route path="account" element={<Account/>}/>
        <Route path="guide" element={<Guide/>}/>
        <Route path="admin" element={<Admin/>}/>
        <Route path="tracking" element={<Navigate to="../campaigns" replace />} />
        <Route path="statistics" element={<Statistics />} />
        <Route path="massive-status/:jobId" element={<MassiveMessagesStatusWrapper />} />
      </Route>

      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/app" replace /> : <Navigate to="/login" replace />}
      />
      <Route path="*" element={<Navigate to={isAuthenticated ? '/app' : '/login'} replace />} />
    </Routes></PublicConfigProvider>
  );
}
export default App;
