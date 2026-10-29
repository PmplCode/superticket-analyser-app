import React, { useMemo } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import TicketScanner from "../../components/TicketScanner";
import ProductSearch from "../../components/ProductSearch";
import DataTools from "../../components/DataTools";
import { useStore } from "../../store/ticketStore";
import { getMonthTotals, getStoreComparisons, getStoreTotals, shiftMonthKey } from "../../utils/insights";
import { formatDate, formatPercent, formatPrice, monthKeyOf } from "../../utils/format";

export default function Dashboard() {
  const tickets = useStore((s) => s.tickets);
  const products = useStore((s) => s.products);
  const router = useRouter();

  const thisMonth = monthKeyOf(new Date());
  const monthTotals = useMemo(() => getMonthTotals(tickets), [tickets]);
  const spentThisMonth = monthTotals.find(([k]) => k === thisMonth)?.[1] ?? 0;
  const spentLastMonth =
    monthTotals.find(([k]) => k === shiftMonthKey(thisMonth, -1))?.[1] ?? 0;
  const change =
    spentLastMonth > 0 ? ((spentThisMonth - spentLastMonth) / spentLastMonth) * 100 : null;

  const savings = useMemo(() => getStoreComparisons(products).slice(0, 3), [products]);
  const topStores = useMemo(() => getStoreTotals(tickets).slice(0, 3), [tickets]);

  return (
    <ScrollView className="flex-1 bg-slate-50" keyboardShouldPersistTaps="handled">
      <View className="p-6">
        <View className="mb-6">
          <Text className="text-slate-400 font-medium">Your grocery tracker</Text>
          <Text className="text-3xl font-bold text-slate-900">SuperTicket</Text>
        </View>

        <View className="flex-row gap-4 mb-8">
          <View className="flex-1 bg-indigo-600 p-5 rounded-3xl premium-shadow">
            <Text className="text-indigo-100 font-medium mb-1">This month</Text>
            <Text className="text-2xl font-bold text-white">{formatPrice(spentThisMonth)}</Text>
            {change !== null && (
              <Text className="text-indigo-100 text-xs mt-1">
                {formatPercent(change)} vs last month
              </Text>
            )}
          </View>
          <View className="flex-1 bg-white p-5 rounded-3xl premium-shadow">
            <Text className="text-slate-500 font-medium mb-1">Tracked</Text>
            <Text className="text-2xl font-bold text-slate-900">{products.length}</Text>
            <Text className="text-slate-400 text-xs mt-1">
              products · {tickets.length} tickets
            </Text>
          </View>
        </View>

        <View className="mb-8">
          <Text className="text-lg font-bold text-slate-900 mb-4">Track Prices</Text>
          <ProductSearch products={products} />
        </View>

        <View className="mb-8">
          <Text className="text-lg font-bold text-slate-900 mb-4">Smart Shortcuts</Text>
          <View className="flex-row gap-4">
            <View className="flex-1 bg-white rounded-3xl p-5 premium-shadow">
              <Text className="text-slate-500 font-medium mb-2">Best savings</Text>
              {savings.length > 0 ? (
                savings.map((s) => (
                  <Pressable
                    key={s.product.id}
                    onPress={() => router.push(`/product/${s.product.id}`)}
                    accessibilityRole="button"
                    className="mb-3"
                  >
                    <Text className="font-bold text-slate-900" numberOfLines={1}>
                      {s.product.name}
                    </Text>
                    <Text className="text-xs text-slate-500">
                      {s.cheapest.supermarket} · save {s.savingPercent.toFixed(0)}%
                    </Text>
                  </Pressable>
                ))
              ) : (
                <Text className="text-slate-400">Buy the same product in 2 stores to compare</Text>
              )}
            </View>

            <View className="flex-1 bg-white rounded-3xl p-5 premium-shadow">
              <Text className="text-slate-500 font-medium mb-2">Favorite stores</Text>
              {topStores.length > 0 ? (
                topStores.map((s) => (
                  <View key={s.supermarket} className="mb-3">
                    <Text className="font-bold text-slate-900" numberOfLines={1}>
                      {s.supermarket}
                    </Text>
                    <Text className="text-xs text-slate-500">
                      {s.trips} trip{s.trips === 1 ? "" : "s"} · {formatPrice(s.total)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text className="text-slate-400">No store history yet</Text>
              )}
            </View>
          </View>
        </View>

        <View className="mb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-slate-900">Recent Tickets</Text>
            <Pressable
              onPress={() => router.push("/tickets")}
              accessibilityRole="button"
              accessibilityLabel="See all tickets"
            >
              <Text className="text-indigo-600 font-semibold">See all</Text>
            </Pressable>
          </View>

          {tickets.length > 0 ? (
            tickets.slice(0, 3).map((ticket) => (
              <View
                key={ticket.id}
                className="bg-white p-4 rounded-2xl premium-shadow mb-4 flex-row items-center"
              >
                <View className="bg-slate-100 p-3 rounded-xl mr-4">
                  <FontAwesome name="shopping-bag" size={20} color="#64748b" />
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-slate-900">{ticket.supermarket}</Text>
                  <Text className="text-slate-400 text-xs">{formatDate(ticket.date)}</Text>
                </View>
                <Text className="font-bold text-slate-900">{formatPrice(ticket.total)}</Text>
              </View>
            ))
          ) : (
            <View className="bg-slate-100 p-8 rounded-3xl items-center">
              <Text className="text-slate-500 font-medium">No tickets yet. Start scanning!</Text>
            </View>
          )}
        </View>

        <Text className="text-lg font-bold text-slate-900 mb-4">Add New Ticket</Text>
        <View className="bg-white rounded-3xl premium-shadow overflow-hidden mb-8">
          <TicketScanner />
        </View>

        <Text className="text-lg font-bold text-slate-900 mb-4">Your data</Text>
        <DataTools />
      </View>
    </ScrollView>
  );
}
