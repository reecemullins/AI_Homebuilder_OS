'use client';

import {
  Building2,
  Map,
  Users,
  ClipboardCheck,
  Calendar,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500">Welcome back. Here's an overview of your operations.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Lots"
          value="12"
          description="3 new this week"
          icon={<Map className="w-5 h-5 text-blue-600" />}
        />
        <StatCard
          title="Active Builds"
          value="5"
          description="2 in framing"
          icon={<Building2 className="w-5 h-5 text-green-600" />}
        />
        <StatCard
          title="Scheduled Inspections"
          value="3"
          description="Next 7 days"
          icon={<ClipboardCheck className="w-5 h-5 text-amber-600" />}
        />
        <StatCard
          title="Upcoming Tasks"
          value="8"
          description="Due this week"
          icon={<Calendar className="w-5 h-5 text-purple-600" />}
        />
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Top Opportunities */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Top Lot Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { address: '123 Oak Street', city: 'Marietta', score: 85, price: 75000 },
                { address: '456 Pine Ave', city: 'Alpharetta', score: 78, price: 82000 },
                { address: '789 Elm Dr', city: 'Roswell', score: 72, price: 68000 },
              ].map((lot, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-slate-900">{lot.address}</p>
                    <p className="text-sm text-slate-500">{lot.city}, GA</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600">Score: {lot.score}</p>
                    <p className="text-sm text-slate-500">
                      ${lot.price.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              Action Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { type: 'Inspection', message: 'Framing inspection tomorrow at 123 Oak St' },
                { type: 'Sub', message: 'Confirm electrician for Thursday' },
                { type: 'Draw', message: 'Draw #2 ready for submission' },
              ].map((alert, i) => (
                <div key={i} className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <p className="text-sm font-medium text-amber-800">{alert.type}</p>
                  <p className="text-sm text-amber-700">{alert.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Builds Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Active Builds
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium text-slate-500">Address</th>
                  <th className="pb-3 font-medium text-slate-500">Status</th>
                  <th className="pb-3 font-medium text-slate-500">Progress</th>
                  <th className="pb-3 font-medium text-slate-500">Budget</th>
                  <th className="pb-3 font-medium text-slate-500">Est. Complete</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  { address: '123 Oak St', status: 'FRAMING', progress: 35, budget: 280000, complete: 'Mar 15' },
                  { address: '456 Pine Ave', status: 'FOUNDATION', progress: 15, budget: 310000, complete: 'Apr 20' },
                  { address: '789 Elm Dr', status: 'ROUGH_INS', progress: 50, budget: 265000, complete: 'Feb 28' },
                ].map((build, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-3 font-medium text-slate-900">{build.address}</td>
                    <td className="py-3">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                        {build.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full max-w-[100px]">
                          <div
                            className="h-2 bg-blue-600 rounded-full"
                            style={{ width: `${build.progress}%` }}
                          />
                        </div>
                        <span className="text-sm text-slate-500">{build.progress}%</span>
                      </div>
                    </td>
                    <td className="py-3 text-slate-600">${build.budget.toLocaleString()}</td>
                    <td className="py-3 text-slate-600">{build.complete}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
            <p className="text-sm text-slate-500 mt-1">{description}</p>
          </div>
          <div className="p-2 bg-slate-100 rounded-lg">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
