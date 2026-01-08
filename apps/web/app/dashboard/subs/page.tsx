'use client';

import Link from 'next/link';
import { Plus, Star, Phone, Mail, Shield, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Mock data
const mockSubs = [
  {
    id: '1',
    companyName: 'ABC Framing Co.',
    contactName: 'John Smith',
    phone: '(770) 555-0101',
    email: 'john@abcframing.com',
    trades: ['FRAMING'],
    reliabilityScore: 0.92,
    onTimeRate: 0.95,
    qualityRating: 0.88,
    completedJobs: 24,
    status: 'PREFERRED',
  },
  {
    id: '2',
    companyName: 'Elite Electric',
    contactName: 'Mike Johnson',
    phone: '(770) 555-0202',
    email: 'mike@eliteelectric.com',
    trades: ['ELECTRICAL'],
    reliabilityScore: 0.85,
    onTimeRate: 0.88,
    qualityRating: 0.9,
    completedJobs: 18,
    status: 'APPROVED',
  },
  {
    id: '3',
    companyName: 'Pro Plumbing Services',
    contactName: 'Dave Wilson',
    phone: '(770) 555-0303',
    email: 'dave@proplumbing.com',
    trades: ['PLUMBING'],
    reliabilityScore: 0.78,
    onTimeRate: 0.75,
    qualityRating: 0.82,
    completedJobs: 12,
    status: 'APPROVED',
  },
  {
    id: '4',
    companyName: 'Cool Air HVAC',
    contactName: 'Tom Brown',
    phone: '(770) 555-0404',
    email: 'tom@coolairhvac.com',
    trades: ['HVAC'],
    reliabilityScore: 0.88,
    onTimeRate: 0.92,
    qualityRating: 0.85,
    completedJobs: 15,
    status: 'PREFERRED',
  },
  {
    id: '5',
    companyName: 'Quality Concrete',
    contactName: 'Bill Davis',
    phone: '(770) 555-0505',
    email: 'bill@qualityconcrete.com',
    trades: ['CONCRETE'],
    reliabilityScore: 0.65,
    onTimeRate: 0.6,
    qualityRating: 0.72,
    completedJobs: 8,
    status: 'PROBATION',
  },
];

const tradeColors: Record<string, string> = {
  FRAMING: 'bg-purple-100 text-purple-700',
  ELECTRICAL: 'bg-amber-100 text-amber-700',
  PLUMBING: 'bg-blue-100 text-blue-700',
  HVAC: 'bg-cyan-100 text-cyan-700',
  CONCRETE: 'bg-slate-100 text-slate-700',
  ROOFING: 'bg-red-100 text-red-700',
  DRYWALL: 'bg-pink-100 text-pink-700',
  PAINT: 'bg-indigo-100 text-indigo-700',
};

const statusColors: Record<string, string> = {
  PREFERRED: 'bg-green-100 text-green-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  VETTING: 'bg-amber-100 text-amber-700',
  PROBATION: 'bg-red-100 text-red-700',
  BLACKLISTED: 'bg-slate-100 text-slate-700',
};

export default function SubsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Subcontractors</h1>
          <p className="text-slate-500">{mockSubs.length} subcontractors in your network</p>
        </div>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Subcontractor
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-green-600" />
              <span className="text-sm text-slate-500">Preferred</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {mockSubs.filter(s => s.status === 'PREFERRED').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-slate-500">Avg Reliability</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {(mockSubs.reduce((sum, s) => sum + s.reliabilityScore, 0) / mockSubs.length * 100).toFixed(0)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-slate-500">Avg On-Time</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {(mockSubs.reduce((sum, s) => sum + s.onTimeRate, 0) / mockSubs.length * 100).toFixed(0)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-slate-500">Total Jobs</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {mockSubs.reduce((sum, s) => sum + s.completedJobs, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subs Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockSubs.map((sub) => (
          <Link key={sub.id} href={`/dashboard/subs/${sub.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{sub.companyName}</CardTitle>
                    <p className="text-sm text-slate-500">{sub.contactName}</p>
                  </div>
                  <span
                    className={cn(
                      'px-2 py-1 text-xs font-medium rounded',
                      statusColors[sub.status]
                    )}
                  >
                    {sub.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Trades */}
                  <div className="flex gap-1 flex-wrap">
                    {sub.trades.map((trade) => (
                      <span
                        key={trade}
                        className={cn(
                          'px-2 py-0.5 text-xs font-medium rounded',
                          tradeColors[trade] || 'bg-slate-100 text-slate-700'
                        )}
                      >
                        {trade}
                      </span>
                    ))}
                  </div>

                  {/* Contact */}
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="w-3 h-3" />
                      {sub.phone}
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail className="w-3 h-3" />
                      {sub.email}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t">
                    <div className="text-center">
                      <p className="text-xs text-slate-500">Reliability</p>
                      <p className={cn(
                        'font-bold text-sm',
                        sub.reliabilityScore >= 0.8 ? 'text-green-600' :
                        sub.reliabilityScore >= 0.6 ? 'text-amber-600' : 'text-red-600'
                      )}>
                        {(sub.reliabilityScore * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500">On-Time</p>
                      <p className={cn(
                        'font-bold text-sm',
                        sub.onTimeRate >= 0.8 ? 'text-green-600' :
                        sub.onTimeRate >= 0.6 ? 'text-amber-600' : 'text-red-600'
                      )}>
                        {(sub.onTimeRate * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500">Jobs</p>
                      <p className="font-bold text-sm text-slate-900">
                        {sub.completedJobs}
                      </p>
                    </div>
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
