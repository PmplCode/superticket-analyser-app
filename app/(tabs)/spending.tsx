import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, useWindowDimensions } from "react-native";
import { BarChart } from "react-native-chart-kit";
import { FontAwesome } from "@expo/vector-icons";
import { useStore } from "../../store/ticketStore";
import {
  getCategorySpending,
  getMonthTotals,
  getStoreTotals,
  roundShares,
  shiftMonthKey,
} from "../../utils/insights";
import {
  formatMonthKey,
  formatPercent,
  formatPrice,
  monthKeyOf,
} from "../../utils/format";

const ShareBars = ({ rows }: { rows: { label: string; total: number; hint?: string }[] }) => {
  const shares = roundShares(rows.map((r) => r.total));
  const max = Math.max(...rows.map((r) => r.total), 0.01);
  return (
    <View>
      {rows.map((row, i) => (
        <View key={row.label} className="mb-4">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="font-semibold text-slate-900 flex-1 pr-2" numberOfLines={1}>
              {row.label}
            </Text>
            <Text className="font-bold text-slate-900">{formatPrice(row.total)}</Text>
          </View>
          <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <View
              className="h-full bg-indigo-600 rounded-full"
              style={{ width: `${(row.total / max) * 100}%` }}
            />
          </View>
          <Text className="text-[11px] text-slate-500 mt-1">
            {shares[i]}% of spending{row.hint ? ` · ${row.hint}` : ""}
          </Text>
        </View>
      ))}
    </View>
  );
};

export default function Spending() {
  const tickets = useStore((s) => s.tickets);
  const { width } = useWindowDimensions();

  const monthTotals = useMemo(() => getMonthTotals(tickets), [tickets]);
  const monthKeys = useMemo(() => monthTotals.map(([k]) => k), [monthTotals]);
  const latestKey = monthKeys[monthKeys.length - 1] ?? monthKeyOf(new Date());
  const [selected, setSelected] = useState<string | null>(null);
  const month = selected && monthKeys.includes(selected) ? selected : latestKey;

  const monthTotal = monthTotals.find(([k]) => k === month)?.[1] ?? 0;
  const previousTotal =
    monthTotals.find(([k]) => k === shiftMonthKey(month, -1))?.[1] ?? null;
  const change =
    previousTotal && previousTotal > 0
      ? ((monthTotal - previousTotal) / previousTotal) * 100
      : null;

  const monthTickets = useMemo(
    () => getStoreTotals(tickets, month).reduce((s, r) => s + r.trips, 0),
    [tickets, month]
  );
  const stores = useMemo(() => getStoreTotals(tickets, month), [tickets, month]);
  const categories = useMemo(() => getCategorySpending(tickets, month), [tickets, month]);

  const multiYear =
    new Set(monthKeys.slice(-6).map((k) => k.slice(0, 4))).size > 1;
  const last6 = monthTotals.slice(-6);
  const chartData = {
    labels: last6.map(([k]) => formatMonthKey(k, multiYear)),
    datasets: [{ data: last6.map(([, t]) => t) }],
  };

  if (tickets.length === 0) {
    return (
      <ScrollView className="flex-1 bg-slate-50">
        <View className="p-6">
          <View className="bg-white p-8 rounded-3xl premium-shadow items-center">
            <View className="bg-indigo-50 p-6 rounded-full mb-4">
              <FontAwesome name="ticket" size={32} color="#4f46e5" />
            </View>
            <Text className="text-lg font-bold text-slate-900 mb-2">
              No spending data yet
            </Text>
            <Text className="text-slate-400 text-center">
              Scan tickets to see your spending summary.
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  const idx = monthKeys.indexOf(month);
  const prevKey = idx > 0 ? monthKeys[idx - 1] : null;
  const nextKey = idx >= 0 && idx < monthKeys.length - 1 ? monthKeys[idx + 1] : null;

  return (
    <ScrollView className="flex-1 bg-slate-50">
      <View className="p-6">
        <Text className="text-2xl font-bold text-slate-900 mb-4">Spending</Text>

        <View className="flex-row items-center justify-between mb-4">
          <Pressable
            disabled={!prevKey}
            onPress={() => prevKey && setSelected(prevKey)}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            className={`p-3 ${prevKey ? "" : "opacity-30"}`}
          >
            <FontAwesome name="chevron-left" size={16} color="#4f46e5" />
          </Pressable>
          <Text className="text-lg font-bold text-slate-900">
            {formatMonthKey(month)} {month.slice(0, 4)}
          </Text>
          <Pressable
            disabled={!nextKey}
            onPress={() => nextKey && setSelected(nextKey)}
            accessibilityRole="button"
            accessibilityLabel="Next month"
            className={`p-3 ${nextKey ? "" : "opacity-30"}`}
          >
            <FontAwesome name="chevron-right" size={16} color="#4f46e5" />
          </Pressable>
        </View>

        <View className="bg-white p-5 rounded-3xl premium-shadow mb-6">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-slate-500 text-sm">Spent this month</Text>
              <Text className="text-4xl font-bold text-indigo-600">
                {formatPrice(monthTotal)}
              </Text>
              {change !== null && (
                <Text
                  className={`text-xs font-bold mt-1 ${
                    change > 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {formatPercent(change)} vs previous month
                </Text>
              )}
            </View>
            <View className="items-end">
              <Text className="text-xs text-slate-500">Average per trip</Text>
              <Text className="text-lg font-bold text-slate-900">
                {formatPrice(monthTickets > 0 ? monthTotal / monthTickets : 0)}
              </Text>
              <Text className="text-xs text-slate-400">{monthTickets} trips</Text>
            </View>
          </View>
        </View>

        {last6.length > 0 && (
          <View className="mb-6">
            <Text className="text-slate-900 font-bold mb-3 text-lg">Last months</Text>
            <View
              className="bg-white p-4 rounded-3xl premium-shadow"
              accessible
              accessibilityLabel={`Monthly spending: ${last6
                .map(([k, t]) => `${formatMonthKey(k, true)} ${formatPrice(t)}`)
                .join(", ")}`}
            >
              <BarChart
                data={chartData}
                width={Math.max(width - 72, 200)}
                height={220}
                yAxisLabel="€"
                yAxisSuffix=""
                chartConfig={{
                  backgroundColor: "#ffffff",
                  backgroundGradientFrom: "#ffffff",
                  backgroundGradientTo: "#ffffff",
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                  barPercentage: 0.6,
                  propsForBackgroundLines: { strokeDasharray: "", stroke: "#e2e8f0" },
                }}
                fromZero
                showValuesOnTopOfBars
                style={{ borderRadius: 16, paddingRight: 8 }}
              />
            </View>
          </View>
        )}

        {categories.length > 0 && (
          <View className="mb-6">
            <Text className="text-slate-900 font-bold mb-3 text-lg">By category</Text>
            <View className="bg-white p-5 rounded-3xl premium-shadow">
              <ShareBars
                rows={categories.slice(0, 8).map(([label, total]) => ({ label, total }))}
              />
            </View>
          </View>
        )}

        {stores.length > 0 && (
          <View className="mb-6">
            <Text className="text-slate-900 font-bold mb-3 text-lg">By store</Text>
            <View className="bg-white p-5 rounded-3xl premium-shadow">
              <ShareBars
                rows={stores.slice(0, 6).map((s) => ({
                  label: s.supermarket,
                  total: s.total,
                  hint: `${s.trips} trip${s.trips === 1 ? "" : "s"}`,
                }))}
              />
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
