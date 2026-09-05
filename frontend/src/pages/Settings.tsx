import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import SettingsUsers from './SettingsUsers'
import TwoFactorSetup from '../components/TwoFactorSetup'
import { Shield, Users, ClipboardList } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Settings() {
  const { isTenantAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState<'users' | 'security'>('users')

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 text-sm lg:text-base">Manage users, security and workspace</p>
      </div>

      <div className="card mb-6 p-2">
        <div className="tabs-navigation" role="tablist" aria-label="Settings tabs">
          <button
            role="tab"
            aria-selected={activeTab === 'users'}
            aria-controls="users-panel"
            id="users-tab"
            onClick={() => setActiveTab('users')}
            className={`tab-link flex items-center gap-2 w-full lg:w-auto ${activeTab === 'users' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-600'}`}
          >
            <Users className="w-4 h-4" aria-hidden="true" /> Users
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'security'}
            aria-controls="security-panel"
            id="security-tab"
            onClick={() => setActiveTab('security')}
            className={`tab-link flex items-center gap-2 w-full lg:w-auto ${activeTab === 'security' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-600'}`}
          >
            <Shield className="w-4 h-4" aria-hidden="true" /> Security
          </button>
          {isTenantAdmin && (
            <Link
              to="/audit-logs"
              className="tab-link flex items-center gap-2 text-gray-600 hover:text-primary-600"
              aria-label="Open audit logs"
            >
              <ClipboardList className="w-4 h-4" aria-hidden="true" /> Audit Log
            </Link>
          )}
        </div>
      </div>

      <div id="users-panel" role="tabpanel" aria-labelledby="users-tab" hidden={activeTab !== 'users'}>
        {activeTab === 'users' && <SettingsUsers />}
      </div>

      <div id="security-panel" role="tabpanel" aria-labelledby="security-tab" hidden={activeTab !== 'security'}>
        {activeTab === 'security' && (
          <div className="card p-6">
            <TwoFactorSetup />
          </div>
        )}
      </div>
    </div>
  )
}
