'use client';

import Link from 'next/link';
import { Plus, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency, getStatusColor } from '@/lib/utils';

// Mock data
const mockBuilds = [
  {
    id: '1',
    address: '123 Oak Street',
    city: 'Marietta',
    status: 'FRAMING',
    progress: 35,
    budgetTotal: 280000,
    actualTotal: 98000,
    estimatedComplete: '2024-03-15',
    floorPlan: 'Craftsman 2400',
  },
  {
    id: '2',
    address: '456 Pine Avenue',
    city: 'Alpharetta',
    status: 'FOUNDATION',
    progress: 15,
    budgetTotal: 310000,
    actualTotal: 46500,
    estimatedComplete: '2024-04-20',
    floorPlan: 'Modern 2800',
  },
  {
    id: '3',
    address: '789 Elm Drive',
    city: 'Roswell',
    status: 'ROUGH_INS',
    progress: 50,
    budgetTotal: 265000,
    actualTotal: 132500,
    estimatedComplete: '2024-02-28',
    floorPlan: 'Traditional 2200',
  },
  {
    id: '4',
    address: '321 Maple Lane',
    city: 'Kennesaw',
    status: 'FINISHES',
    progress: 75,
    budgetTotal: 245000,
    actualTotal: 183750,
    estimatedComplete: '2024-02-10',
    floorPlan: 'Ranch 1800',
  },
];

export default function BuildsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Builds</h1>
          <p className="text-slate-500">{mockBuilds.length} active builds</p>
        </div>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Build
        </Button>
      </div>

      {/* Pipeline Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pre-Construction', count: 2, color: 'bg-slate-500' },
          { label: 'In Progress', count: 4, color: 'bg-blue-500' },
          { label: 'Punch List', count: 1, color: 'bg-amber-500' },
          { label: 'Complete', count: 8, color: 'bg-green-500' },
        ].map((stage) => (
          <Card key={stage.label}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <div className={cn('w-2 h-2 rounded-full', stage.color)} />
                <span className="text-sm text-slate-500">{stage.label}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{stage.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Builds Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {mockBuilds.map((build) => (
          <Link key={build.id} href={`/dashboard/builds/${build.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{build.address}</CardTitle>
                      <p className="text-sm text-slate-500">{build.city}, GA</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'px-2 py-1 text-xs font-medium rounded',
                      getStatusColor(build.status)
                    )}
                  >
                    {build.status.replace('_', ' ')}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Progress */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-500">Progress</span>
                      <span className="font-medium">{build.progress}%</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full">
                      <div
                        className="h-2 bg-blue-600 rounded-full transition-all"
                        style={{ width: `${build.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                    <div>
                      <p className="text-xs text-slate-500">Budget</p>
                      <p className="font-medium text-sm">
                        {formatCurrency(build.budgetTotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Spent</p>
                      <p className="font-medium text-sm">
                        {formatCurrency(build.actualTotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Est. Complete</p>
                      <p className="font-medium text-sm">
                        {new Date(build.estimatedComplete).toLocaleDateString(
                          'en-US',
                          { month: 'short', day: 'numeric' }
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Floor Plan */}
                  <div className="text-sm text-slate-500 pt-2 border-t">
                    {build.floorPlan}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
