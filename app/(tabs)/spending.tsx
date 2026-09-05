import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Dimensions,
} from "react-native";
import { useStore } from "../../store/ticketStore";
import { BarChart } from "react-native-chart-kit";
import { FontAwesome } from "@expo/vector-icons";
import { parseDate } from "../../utils/dates";

const formatPrice = (value: number) => `€${value.toFixed(2)}`;

const formatMonthLabel = (monthKey: string) => {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-GB", { month: "short" });
};

const Spending = () => {
  const { tickets } = useStore();

  const totalSpent = useMemo(() => {
    return tickets.reduce((sum, ticket) => sum + ticket.total, 0);
  }, [tickets]);

  const averagePerTrip = useMemo(() => {
    if (tickets.length === 0) return 0;
    return totalSpent / tickets.length;
  }, [tickets.length, totalSpent]);

  const spendingByMonth = useMemo(() => {
    const monthMap = new Map<string, number>();
    tickets.forEach((ticket) => {
      const date = parseDate(ticket.date);
      if (Number.isNaN(date.getTime())) return;
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}`;
      monthMap.set(monthKey, (monthMap.get(monthKey) ?? 0) + ticket.total);
    });
    const sorted = [...monthMap.entries()].sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    return sorted.slice(-6);
  }, [tickets]);

  const spendingBySupermarket = useMemo(() => {
    const marketMap = new Map<string, number>();
    tickets.forEach((ticket) => {
      marketMap.set(
        ticket.supermarket,
        (marketMap.get(ticket.supermarket) ?? 0) + ticket.total
      );
    });
    return Array.from(marketMap.entries()).sort((a, b) => b[1] - a[1]);
  }, [tickets]);

  const chartData = useMemo(
    () => ({
      labels: spendingByMonth.map(([month]) => formatMonthLabel(month)),
      datasets: [
        {
          data: spendingByMonth.map(([, total]) => total),
        },
      ],
    }),
    [spendingByMonth]
  );

  const totalSupermarketSpend = spendingBySupermarket.reduce(
    (sum, [, total]) => sum + total,
    0
  );

  return (
    <ScrollView className="flex-1 bg-slate-50">
      <View className="p-6">
        <Text className="text-2xl font-bold text-slate-900 mb-2">
          Spending Summary
        </Text>
        <Text className="text-slate-400 mb-6">
          Tracking across {tickets.length} tickets
        </Text>

        <View className="bg-white p-5 rounded-3xl premium-shadow mb-6">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-slate-500 text-sm">Total spent</Text>
              <Text className="text-4xl font-bold text-indigo-600">
                {formatPrice(totalSpent)}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-xs text-slate-400">
                Average per trip
              </Text>
              <Text className="text-lg font-bold text-slate-900">
                {formatPrice(averagePerTrip)}
              </Text>
            </View>
          </View>
        </View>

        {spendingByMonth.length > 0 && (
          <View className="mb-6">
            <Text className="text-slate-900 font-bold mb-3 text-lg">
              Spending by month
            </Text>
            <View className="bg-white p-4 rounded-3xl premium-shadow">
              <BarChart
                data={chartData}
                width={Dimensions.get("window").width - 72}
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
                  propsForBackgroundLines: {
                    strokeDasharray: "",
                    stroke: "#e2e8f0",
                  },
                }}
                fromZero
                showValuesOnTopOfBars
                style={{
                  borderRadius: 16,
                  paddingRight: 8,
                }}
              />
            </View>
          </View>
        )}

        {spendingBySupermarket.length > 0 && (
          <View className="mb-6">
            <Text className="text-slate-900 font-bold mb-3 text-lg">
              Spending by store
            </Text>
            <View className="bg-white p-5 rounded-3xl premium-shadow">
              {spendingBySupermarket.slice(0, 6).map(([supermarket, total]) => {
                const ratio =
                  totalSupermarketSpend > 0 ? total / totalSupermarketSpend : 0;
                return (
                  <View key={supermarket} className="mb-4 last:mb-0">
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className="font-semibold text-slate-900">
                        {supermarket}
                      </Text>
                      <Text className="font-bold text-slate-900">
                        {formatPrice(total)}
                      </Text>
                    </View>
                    <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <View
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${Math.round(ratio * 100)}%` }}
                      />
                    </View>
                    <Text className="text-[10px] text-slate-400 mt-1">
                      {Math.round(ratio * 100)}% of spending
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {tickets.length === 0 && (
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
        )}
      </View>
    </ScrollView>
  );
};

export default Spending;