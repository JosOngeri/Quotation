import { useState } from 'react'
import { BarChart3, Download } from 'lucide-react'

export default function Reports() {
  const [stats] = useState({
    totalQuotes: 47,
    acceptanceRate: 68,
    avgQuoteValue: 142000,
    grossMargin: 18.5
  })

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600">Analytics and reporting</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Quotes (YTD)</p>
            <span className="text-xs text-green-600">+12%</span>
          </div>
          <p className="text-2xl font-bold">{stats.totalQuotes}</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Acceptance Rate</p>
            <span className="text-xs text-green-600">+5%</span>
          </div>
          <p className="text-2xl font-bold">{stats.acceptanceRate}%</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Avg Quote Value</p>
            <span className="text-xs text-green-600">+8%</span>
          </div>
          <p className="text-2xl font-bold">KES {(stats.avgQuoteValue / 1000).toFixed(0)}K</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Gross Margin</p>
            <span className="text-xs text-red-600">-2%</span>
          </div>
          <p className="text-2xl font-bold">{stats.grossMargin}%</p>
        </div>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-primary-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold">Project Variance</h3>
              <p className="text-sm text-gray-600">Cost vs quoted analysis</p>
            </div>
          </div>
          <button className="btn btn-secondary w-full flex items-center justify-center gap-2">
            <Download className="w-4 h-4" />
            Generate Report
          </button>
        </div>

        <div className="card p-6 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-secondary-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-secondary-600" />
            </div>
            <div>
              <h3 className="font-semibold">Quote Performance</h3>
              <p className="text-sm text-gray-600">Conversion and accuracy</p>
            </div>
          </div>
          <button className="btn btn-secondary w-full flex items-center justify-center gap-2">
            <Download className="w-4 h-4" />
            Generate Report
          </button>
        </div>

        <div className="card p-6 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold">Supplier Performance</h3>
              <p className="text-sm text-gray-600">Delivery and quality metrics</p>
            </div>
          </div>
          <button className="btn btn-secondary w-full flex items-center justify-center gap-2">
            <Download className="w-4 h-4" />
            Generate Report
          </button>
        </div>
      </div>
    </div>
  )
}
