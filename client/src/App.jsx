import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useAuth } from './context/AuthContext.jsx';

import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import UserDashboard from './pages/UserDashboard.jsx';
import ReportForm from './pages/ReportForm.jsx';
import AdoptionList from './pages/AdoptionList.jsx';
import AdoptionForm from './pages/AdoptionForm.jsx';
import MyAdoptions from './pages/MyAdoptions.jsx';
import NgoLogin from './pages/NgoLogin.jsx';
import NgoDashboard from './pages/NgoDashboard.jsx';

function NotFound() {
  return (
    <div className="page-background min-h-screen">
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <p className="text-6xl font-extrabold text-emerald-700">404</p>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Page not found</h1>
        <p className="mt-2 text-slate-600">
          The page you are looking for does not exist or has moved.
        </p>
        <a
          href="/"
          className="mt-8 rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
        >
          Back to home
        </a>
      </div>
    </div>
  );
}

/** Sends an already signed-in account to the dashboard that matches its role. */
function HomeRoute() {
  const { isAuthenticated, isNgo } = useAuth();
  if (isNgo) return <Navigate to="/ngo/dashboard" replace />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <Landing />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute role="user">
            <UserDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report/:category"
        element={
          <ProtectedRoute role="user">
            <ReportForm />
          </ProtectedRoute>
        }
      />

      <Route path="/adoptions" element={<AdoptionList />} />
      <Route
        path="/adopt/new"
        element={
          <ProtectedRoute role="user">
            <AdoptionForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/adopt/mine"
        element={
          <ProtectedRoute role="user">
            <MyAdoptions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/adopt/:id/edit"
        element={
          <ProtectedRoute role="user">
            <AdoptionForm />
          </ProtectedRoute>
        }
      />

      <Route path="/ngo/login" element={<NgoLogin />} />
      <Route
        path="/ngo/dashboard"
        element={
          <ProtectedRoute role="ngo">
            <NgoDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
