'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  Map,
  Grid,
  ArrowUpDown,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency, getStatusColor } from '@/lib/utils';

// Mock data for demonstration
const mockLots = [
  {
    id: '1',
    address: '123 Oak Street',
    city: 'Marietta',
    county: 'Cobb',
    acreage: 0.45,
    listPrice: 75000,
    overallScore: 85,
    status: 'NEW',
    source: 'MLS',
    daysOnMarket: 14,
    schoolRating: 8,
  },
  {
    id: '2',
    address: '456 Pine Avenue',
    city: 'Alpharetta',
    county: 'Fulton',
    acreage: 0.38,
    listPrice: 82000,
    overallScore: 78,
    status: 'REVIEWING',
    source: 'WHOLESALER',
    daysOnMarket: 7,
    schoolRating: 9,
  },
  {
    id: '3',
    address: '789 Elm Drive',
    city: 'Roswell',
    county: 'Fulton',
    acreage: 0.52,
    listPrice: 68000,
    overallScore: 72,
    status: 'CONTACTED',
    source: 'MLS',
    daysOnMarket: 45,
    schoolRating: 7,
  },
  {
    id: '4',
    address: '321 Maple Lane',
    city: 'Kennesaw',
    county: 'Cobb',
    acreage: 0.41,
    listPrice: 58000,
    overallScore: 68,
    status: 'NEGOTIATING',
    source: 'DIRECT_MAIL',
    daysOnMarket: 120,
    schoolRating: 6,
  },
  {
    id: '5',
    address: '654 Birch Court',
    city: 'Johns Creek',
    county: 'Fulton',
    acreage: 0.35,
    listPrice: 95000,
    overallScore: 91,
    status: 'UNDER_CONTRACT',
    source: 'MLS',
    daysOnMarket: 3,
    schoolRating: 10,
  },
];

const statusOptions = [
  'NEW',
  'REVIEWING',
  'CONTACTED',
  'NEGOTIATING',
  'UNDER_CONTRACT',
  'DUE_DILIGENCE',
  'PURCHASED',
  'PASSED',
  'LOST',
];

export default function LotsPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);

  const filteredLots = mockLots.filter((lot) => {
    const matchesSearch =
      !searchQuery ||
      lot.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lot.city.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      selectedStatus.length === 0 || selectedStatus.includes(lot.status);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lot Pipeline</h1>
          <p className="text-slate-500">
            {mockLots.length} lots in your pipeline
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Sparkles className="w-4 h-4 mr-2" />
            AI Digest
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Lot
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by address or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 flex-wrap">
              {statusOptions.slice(0, 5).map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setSelectedStatus((prev) =>
                      prev.includes(status)
                        ? prev.filter((s) => s !== status)
                        : [...prev, status]
                    );
                  }}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
                    selectedStatus.includes(status)
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {status.replace('_', ' ')}
                </button>
              ))}
              <button className="px-3 py-1.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200">
                <Filter className="w-3 h-3 inline mr-1" />
                More
              </button>
            </div>

            {/* View Toggle */}
            <div className="flex border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-2',
                  viewMode === 'list'
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-400 hover:text-slate-600'
                )}
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-2',
                  viewMode === 'grid'
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-400 hover:text-slate-600'
                )}
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lots List/Grid */}
      {viewMode === 'list' ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-6 py-3 font-medium text-slate-500">
                    Address
                  </th>
                  <th className="px-6 py-3 font-medium text-slate-500">Score</th>
                  <th className="px-6 py-3 font-medium text-slate-500">
                    Status
                  </th>
                  <th className="px-6 py-3 font-medium text-slate-500">Price</th>
                  <th className="px-6 py-3 font-medium text-slate-500">
                    Acreage
                  </th>
                  <th className="px-6 py-3 font-medium text-slate-500">
                    Source
                  </th>
                  <th className="px-6 py-3 font-medium text-slate-500">DOM</th>
                  <th className="px-6 py-3 font-medium text-slate-500">
                    Schools
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredLots.map((lot) => (
                  <tr
                    key={lot.id}
                    className="hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/lots/${lot.id}`}
                        className="font-medium text-slate-900 hover:text-blue-600"
                      >
                        {lot.address}
                      </Link>
                      <p className="text-sm text-slate-500">
                        {lot.city}, {lot.county}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium',
                          lot.overallScore >= 80
                            ? 'bg-green-100 text-green-700'
                            : lot.overallScore >= 60
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                        )}
                      >
                        <Sparkles className="w-3 h-3" />
                        {lot.overallScore}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'px-2 py-1 text-xs font-medium rounded',
                          getStatusColor(lot.status)
                        )}
                      >
                        {lot.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatCurrency(lot.listPrice)}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {lot.acreage} ac
                    </td>
                    <td className="px-6 py-4 text-slate-600">{lot.source}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {lot.daysOnMarket}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {lot.schoolRating}/10
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLots.map((lot) => (
            <Link key={lot.id} href={`/dashboard/lots/${lot.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{lot.address}</CardTitle>
                      <p className="text-sm text-slate-500">
                        {lot.city}, {lot.county}
                      </p>
                    </div>
                    <div
                      className={cn(
                        'flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium',
                        lot.overallScore >= 80
                          ? 'bg-green-100 text-green-700'
                          : lot.overallScore >= 60
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      )}
                    >
                      <Sparkles className="w-3 h-3" />
                      {lot.overallScore}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={cn(
                        'px-2 py-1 text-xs font-medium rounded',
                        getStatusColor(lot.status)
                      )}
                    >
                      {lot.status.replace('_', ' ')}
                    </span>
                    <span className="text-lg font-bold text-slate-900">
                      {formatCurrency(lot.listPrice)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-slate-500">Acres</p>
                      <p className="font-medium">{lot.acreage}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">DOM</p>
                      <p className="font-medium">{lot.daysOnMarket}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Schools</p>
                      <p className="font-medium">{lot.schoolRating}/10</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
