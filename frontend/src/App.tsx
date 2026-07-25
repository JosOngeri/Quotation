import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import Login from './pages/Login'
import PlatformAdminDashboard from './pages/PlatformAdminDashboard'
import ClientPortal from './pages/ClientPortal'
import Dashboard from './pages/Dashboard'
import Quotes from './pages/Quotes'
import Projects from './pages/Projects'
import Clients from './pages/Clients'
import Suppliers from './pages/Suppliers'
import Products from './pages/Products'
import Reports from './pages/Reports'
import SettingsUsers from './pages/SettingsUsers'
import NotFound from './pages/NotFound'
import ServerError from './pages/ServerError'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Platform Admin routes */}
            <Route 
              path="/platform-admin" 
              element={
                <ProtectedRoute requirePlatformAdmin>
                  <PlatformAdminDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Client Portal route */}
            <Route 
              path="/client-portal" 
              element={
                <ProtectedRoute>
                  <ClientPortal />
                </ProtectedRoute>
              } 
            />
            
            {/* Tenant routes with layout */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route 
                path="dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="quotes" 
                element={
                  <ProtectedRoute requireEstimator>
                    <Quotes />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="projects" 
                element={
                  <ProtectedRoute>
                    <Projects />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="clients" 
                element={
                  <ProtectedRoute>
                    <Clients />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="suppliers" 
                element={
                  <ProtectedRoute>
                    <Suppliers />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="products" 
                element={
                  <ProtectedRoute>
                    <Products />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="reports" 
                element={
                  <ProtectedRoute>
                    <Reports />
                </ProtectedRoute>
                } 
              />
              <Route 
                path="settings/users" 
                element={
                  <ProtectedRoute requireTenantAdmin>
                    <SettingsUsers />
                  </ProtectedRoute>
                } 
              />
            </Route>
            
            {/* Error pages */}
            <Route path="/server-error" element={<ServerError />} />
            
            {/* Catch all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
