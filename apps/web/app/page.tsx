import Link from 'next/link';
import { Building2, Map, Users, ClipboardCheck, Package, BarChart3 } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">
            Builder<span className="text-blue-500">OS</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            AI-powered operational system for residential construction management.
            Streamline land sourcing, coordinate subcontractors, and optimize your builds.
          </p>
          <div className="mt-8 flex gap-4 justify-center">
            <Link
              href="/dashboard"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="/auth/sign-in"
              className="border border-slate-600 hover:border-slate-500 text-slate-300 px-8 py-3 rounded-lg font-medium transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <FeatureCard
            icon={<Map className="w-8 h-8 text-blue-500" />}
            title="Land Sourcing"
            description="AI-scored lot discovery, comparable analysis, and automated deal flow management."
          />
          <FeatureCard
            icon={<Users className="w-8 h-8 text-green-500" />}
            title="Sub Coordination"
            description="Automated scheduling, confirmation sequences, and reliability tracking for subcontractors."
          />
          <FeatureCard
            icon={<ClipboardCheck className="w-8 h-8 text-amber-500" />}
            title="Inspection Readiness"
            description="AI-powered pre-audits, photo analysis, and jurisdiction-specific checklists."
          />
          <FeatureCard
            icon={<Package className="w-8 h-8 text-purple-500" />}
            title="Procurement"
            description="Material price tracking, volume optimization, and supplier management."
          />
          <FeatureCard
            icon={<Building2 className="w-8 h-8 text-red-500" />}
            title="Build Management"
            description="Project timelines, milestone tracking, and draw documentation."
          />
          <FeatureCard
            icon={<BarChart3 className="w-8 h-8 text-cyan-500" />}
            title="Analytics"
            description="Real-time dashboards, margin analysis, and performance reporting."
          />
        </div>
      </div>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-colors">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400 text-sm">{description}</p>
    </div>
  );
}
