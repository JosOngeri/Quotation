import { useEffect } from 'react'
import AnalyticsDashboard from '../components/AnalyticsDashboard'

export default function Analytics() {
  useEffect(() => {
    document.title = 'Analytics - QMS'
  }, [])

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 text-sm lg:text-base">Workspace performance and insights</p>
      </div>
      <div className="card p-4">
        <AnalyticsDashboard />
      </div>
    </div>
  )
}
