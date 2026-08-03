import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Brain, DollarSign, Briefcase, Users, Star, Loader, Sparkles } from 'lucide-react';
import { fetchAnalyticsSummary, fetchRevenueGraph, predictDemand, generateAIRecommendations, type AnalyticsSummary, type RevenueDataPoint } from '@/lib/analytics';
import { formatINR } from '@/lib/pricing';

export default function AdminAIDashboard() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [s, r] = await Promise.all([
        fetchAnalyticsSummary(),
        fetchRevenueGraph(30),
      ]);
      setSummary(s);
      setRevenueData(r);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader className="animate-spin text-blue-600" size={28} />
      </div>
    );
  }

  if (!summary) return null;

  const prediction = predictDemand(revenueData);
  const recommendations = generateAIRecommendations(summary);
  const maxRevenue = Math.max(...revenueData.map((d) => d.revenue), 1);

  const cards = [
    { label: "Today's Revenue", value: formatINR(summary.todayRevenue), icon: DollarSign, color: 'bg-green-100 text-green-700' },
    { label: 'Pending Bookings', value: summary.pendingBookings, icon: Briefcase, color: 'bg-amber-100 text-amber-700' },
    { label: 'Cancelled Jobs', value: summary.cancelledJobs, icon: TrendingDown, color: 'bg-red-100 text-red-700' },
    { label: 'Available Technicians', value: summary.availableTechnicians, icon: Users, color: 'bg-blue-100 text-blue-700' },
    { label: 'Inactive Customers', value: summary.inactiveCustomers, icon: Users, color: 'bg-purple-100 text-purple-700' },
    { label: 'Avg Rating', value: `${summary.avgRating}★`, icon: Star, color: 'bg-yellow-100 text-yellow-700' },
    { label: 'New Bookings Today', value: summary.newBookingsToday, icon: TrendingUp, color: 'bg-cyan-100 text-cyan-700' },
    { label: 'Completed Today', value: summary.completedJobsToday, icon: TrendingUp, color: 'bg-emerald-100 text-emerald-700' },
  ];

  const TrendIcon = prediction.trend === 'up' ? TrendingUp : prediction.trend === 'down' ? TrendingDown : Minus;
  const trendColor = prediction.trend === 'up' ? 'text-green-600' : prediction.trend === 'down' ? 'text-red-600' : 'text-gray-500';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-gray-900 mb-1 flex items-center gap-2">
          <Brain size={24} className="text-blue-600" /> AI Dashboard
        </h2>
        <p className="text-gray-500 text-sm">Real-time analytics, demand forecasting, and AI-powered recommendations.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className={'w-10 h-10 rounded-lg flex items-center justify-center mb-3 ' + card.color}>
              <card.icon size={18} />
            </div>
            <div className="text-2xl font-extrabold text-gray-900">{card.value}</div>
            <div className="text-xs text-gray-500 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 text-sm mb-4">Revenue Trend (Last 30 Days)</h3>
          <div className="flex items-end gap-1 h-40">
            {revenueData.length === 0 ? (
              <p className="text-sm text-gray-400">No revenue data yet.</p>
            ) : (
              revenueData.map((d, i) => (
                <div key={i} className="flex-1 bg-blue-500 hover:bg-blue-600 rounded-t-sm transition-colors group relative"
                  style={{ height: `${Math.max((d.revenue / maxRevenue) * 100, 2)}%` }}
                  title={`${d.date}: ${formatINR(d.revenue)}`}>
                </div>
              ))
            )}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>30 days ago</span>
            <span>Today</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
            <Sparkles size={16} className="text-blue-600" /> Demand Forecast
          </h3>
          <div className="flex items-center gap-3 mb-4">
            <div className={'w-14 h-14 rounded-xl flex items-center justify-center ' + (prediction.trend === 'up' ? 'bg-green-100' : prediction.trend === 'down' ? 'bg-red-100' : 'bg-gray-100')}>
              <TrendIcon size={24} className={trendColor} />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-gray-900">{prediction.nextWeek} bookings</div>
              <div className={'text-sm font-semibold capitalize ' + trendColor}>{prediction.trend} trend predicted</div>
            </div>
          </div>
          <p className="text-sm text-gray-500">Based on the last 14 days of booking data, we expect approximately {prediction.nextWeek} bookings in the next 7 days.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
          <Brain size={16} className="text-blue-600" /> AI Recommendations
        </h3>
        <div className="space-y-3">
          {recommendations.map((rec, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <Sparkles size={16} className="text-blue-600 mt-0.5 shrink-0" />
              <p className="text-sm text-gray-700">{rec}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 text-sm mb-3">Customer Satisfaction</h3>
          <div className="flex items-center gap-2">
            <Star size={28} className="text-amber-500 fill-amber-500" />
            <span className="text-3xl font-extrabold text-gray-900">{summary.avgRating}</span>
            <span className="text-sm text-gray-400">/ 5.0</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Based on all customer reviews</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 text-sm mb-3">Platform Overview</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Total Customers</span><span className="font-bold text-gray-900">{summary.totalCustomers}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Total Technicians</span><span className="font-bold text-gray-900">{summary.totalTechnicians}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Available Now</span><span className="font-bold text-green-600">{summary.availableTechnicians}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
