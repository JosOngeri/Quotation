import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'
import { 
  LayoutDashboard, 
  FileText, 
  FolderKanban, 
  Users, 
  Truck, 
  Package, 
  BarChart3, 
  Settings, 
  LogOut,
  Menu,
  X 
} from 'lucide-react'
import MobileNavigation from './MobileNavigation'
import BottomNavigation from './BottomNavigation'

export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Quotes', href: '/quotes', icon: FileText },
    { name: 'Projects', href: '/projects', icon: FolderKanban },
    { name: 'Clients', href: '/clients', icon: Users },
    { name: 'Suppliers', href: '/suppliers', icon: Truck },
    { name: 'Products', href: '/products', icon: Package },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'Settings', href: '/settings/users', icon: Settings },
  ]

  const secondaryNavigation = [
    { name: 'Clients', href: '/clients', icon: Users },
    { name: 'Suppliers', href: '/suppliers', icon: Truck },
    { name: 'Products', href: '/products', icon: Package },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'Settings', href: '/settings/users', icon: Settings },
  ]

  const handleMobileNavigate = (path: string) => {
    setMobileMenuOpen(false)
  }

  const handleMoreClick = () => {
    setMoreMenuOpen(!moreMenuOpen)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header - visible only on mobile */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div>
              <h1 className="text-xl font-bold">QMS</h1>
              <p className="text-xs text-gray-400">Quotation Management</p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu - visible only on mobile when open */}
      <div className={`lg:hidden fixed top-16 left-0 right-0 bg-gray-900 text-white z-40 transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-y-0' : '-translate-y-full'}`}>
        <nav className="p-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => handleMobileNavigate(item.href)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-primary-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Sidebar - hidden on mobile, visible on desktop */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-gray-900 text-white">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-800">
            <h1 className="text-xl font-bold">QMS</h1>
            <p className="text-sm text-gray-400">Quotation Management</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-primary-600 text-white' 
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content - responsive margins */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen pb-20 lg:pb-0">
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation - visible only on mobile */}
      <BottomNavigation onMoreClick={handleMoreClick} />

      {/* More Menu Overlay */}
      {moreMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50"
          onClick={() => setMoreMenuOpen(false)}
        />
      )}

      {/* More Menu - visible only on mobile */}
      {moreMenuOpen && (
        <div className="lg:hidden fixed bottom-16 left-4 right-4 bg-white rounded-lg shadow-lg z-50 p-4">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">More Options</h3>
          <nav className="space-y-2">
            {secondaryNavigation.map((item) => {
              const isActive = location.pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMoreMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-primary-600 text-white' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      )}
    </div>
  )
}
