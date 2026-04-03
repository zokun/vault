import { getDashboardStats } from "@/lib/services/dashboard";
import { Header } from "@/components/layout/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { PortfolioChart } from "@/components/dashboard/portfolio-chart";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { Recommendations } from "@/components/dashboard/recommendations";
import { ItemCard } from "@/components/catalog/item-card";
import {
  Package,
  DollarSign,
  TrendingDown,
  Tag,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div>
      <Header
        title="Dashboard"
        description="Your personal belongings portfolio at a glance"
      />

      <div className="p-6 space-y-6">
        {/* Stats row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Items"
            value={String(stats.totalItems)}
            icon={Package}
          />
          <StatsCard
            title="Portfolio Value"
            value={formatCurrency(stats.totalEstimatedValue)}
            subtitle={`Paid ${formatCurrency(stats.totalPurchaseValue)}`}
            icon={DollarSign}
          />
          <StatsCard
            title="Total Depreciation"
            value={formatCurrency(stats.totalDepreciation)}
            subtitle={`${(stats.deprecationRate * 100).toFixed(0)}% of purchase value`}
            icon={TrendingDown}
            trend={
              stats.deprecationRate > 0
                ? {
                    value: `-${(stats.deprecationRate * 100).toFixed(0)}%`,
                    positive: false,
                  }
                : undefined
            }
          />
          <StatsCard
            title="Active Rentals"
            value={String(stats.activeRentals)}
            subtitle="Items listed for rent"
            icon={Tag}
          />
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          <PortfolioChart
            totalValue={stats.totalEstimatedValue}
            totalPurchaseValue={stats.totalPurchaseValue}
          />
          <CategoryBreakdown data={stats.itemsByCategory} />
        </div>

        {/* Recommendations */}
        <Recommendations recommendations={stats.recommendations} />

        {/* Recently Added */}
        {stats.recentlyAdded.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-3">
              Recently Added
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.recentlyAdded.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
