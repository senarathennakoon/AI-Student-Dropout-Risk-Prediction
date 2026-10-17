import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { darkTheme } from './theme';
import { ProfessionalLayout } from './components/layout/ProfessionalLayout';
import { StudentRegistrationForm } from './components/forms/StudentRegistrationForm';
import { StudentProfilePage } from './pages/StudentProfilePage';
import { StudentAccountPage } from './pages/StudentAccountPage';
import { RiskExplanationPage } from './pages/RiskExplanationPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { StaffLoginPage } from './pages/StaffLoginPage';
import { StaffSignupPage } from './pages/StaffSignupPage';
import { StaffDashboard } from './pages/StaffDashboard';
import { PredictionHistoryDashboardPage } from './pages/PredictionHistoryDashboardPage';
import { StaffRiskExplanationPage } from './pages/StaffRiskExplanationPage';
import { StaffStudentsMonitoringPage } from './pages/StaffStudentsMonitoringPage';
import { InterventionsPage } from './pages/InterventionsPage';
import { ReportsPage } from './pages/ReportsPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <ProfessionalLayout>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/staff/login" element={<StaffLoginPage />} />
              <Route path="/staff/signup" element={<StaffSignupPage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route
                path="/register"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentRegistrationForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile/:studentId"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/account"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentAccountPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/explain/:studentId"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <RiskExplanationPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/staff"
                element={
                  <ProtectedRoute allowedRoles={['staff']}>
                    <StaffDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/staff/prediction-history"
                element={
                  <ProtectedRoute allowedRoles={['staff', 'admin']}>
                    <PredictionHistoryDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/staff/explain"
                element={
                  <ProtectedRoute allowedRoles={['staff', 'admin']}>
                    <StaffRiskExplanationPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/staff/explain/:studentId"
                element={
                  <ProtectedRoute allowedRoles={['staff', 'admin']}>
                    <StaffRiskExplanationPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/staff/students" element={<Navigate to="/staff/prediction-history" replace />} />
              <Route
                path="/staff/interventions"
                element={
                  <ProtectedRoute allowedRoles={['staff', 'admin']}>
                    <InterventionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/staff/reports"
                element={
                  <ProtectedRoute allowedRoles={['staff', 'admin']}>
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/students"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <StaffStudentsMonitoringPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/interventions"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <InterventionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </ProfessionalLayout>
        </AuthProvider>
      </Router>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </ThemeProvider>
  );
}

export default App;