import React, { useMemo } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import { useStore } from "../../store/ticketStore";
import PriceHistoryChart from "../../components/PriceHistoryChart";
import { getPriceMovers, getStoreComparisons } from "../../utils/insights";
import {
  formatPercent,
  formatPrice,
  formatSignedPrice,
} from "../../utils/format";

const MAX_MOVERS = 8;
const MAX_CHARTS = 3;

export default function Insights() {
  const products = useStore((s) => s.products);
  const tickets = useStore((s) => s.tickets);
  const router = useRouter();

  const movers = useMemo(() => getPriceMovers(products), [products]);
  const comparisons = useMemo(() => getStoreComparisons(products), [products]);

  return (
    <ScrollView className="flex-1 bg-slate-50">
      <View className="p-6">
        <Text className="text-2xl font-bold text-slate-900 mb-2">
          Market Insights
        </Text>
        <Text className="text-slate-400 mb-6">
          Tracking {products.length} products across {tickets.length} tickets
        </Text>

        {movers.length === 0 && comparisons.length === 0 && (
          <View className="bg-white p-8 rounded-3xl premium-shadow items-center">
            <View className="bg-indigo-50 p-6 rounded-full mb-4">
              <FontAwesome name="line-chart" size={32} color="#4f46e5" />
            </View>
            <Text className="text-lg font-bold text-slate-900 mb-2">
              No trends yet
            </Text>
            <Text className="text-slate-400 text-center">
              Scan more tickets with the same products to see price changes over
              time.
            </Text>
          </View>
        )}

        {movers.length > 0 && (
          <View className="mb-8">
            <Text className="text-lg font-bold text-slate-900 mb-4">
              Biggest price changes
            </Text>
            <View className="bg-white rounded-3xl premium-shadow p-5">
              {movers.slice(0, MAX_MOVERS).map((m) => {
                const up = m.delta > 0;
                return (
                  <Pressable
                    key={m.product.id}
                    onPress={() => router.push(`/product/${m.product.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`${m.product.name}, price ${
                      up ? "up" : "down"
                    } ${formatPercent(Math.abs(m.percent))}`}
                    className="flex-row justify-between items-center py-3 border-b border-slate-50"
                  >
                    <View className="flex-1 pr-3">
                      <Text className="font-bold text-slate-900">{m.product.name}</Text>
                      <Text className="text-slate-400 text-xs">
                        {m.latest.supermarket}
                        {m.sameStore ? "" : " · vs another store"}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="font-bold text-slate-900">
                        {formatPrice(m.latest.price)}
                      </Text>
                      <Text
                        className={`text-xs font-bold ${
                          up ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        {up ? "▲" : "▼"} {formatSignedPrice(m.delta)} (
                        {formatPercent(m.percent)})
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {comparisons.length > 0 && (
          <View className="mb-8">
            <Text className="text-lg font-bold text-slate-900 mb-4">
              Where to buy cheaper
            </Text>
            <View className="bg-white rounded-3xl premium-shadow p-5">
              {comparisons.slice(0, MAX_MOVERS).map((c) => (
                <Pressable
                  key={c.product.id}
                  onPress={() => router.push(`/product/${c.product.id}`)}
                  accessibilityRole="button"
                  className="py-3 border-b border-slate-50"
                >
                  <Text className="font-bold text-slate-900">{c.product.name}</Text>
                  <Text className="text-xs text-slate-500 mt-1">
                    Cheapest at {c.cheapest.supermarket} (
                    {formatPrice(c.cheapest.price)}) · {c.mostExpensive.supermarket}{" "}
                    {formatPrice(c.mostExpensive.price)} · save{" "}
                    {c.savingPercent.toFixed(0)}%
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {movers.slice(0, MAX_CHARTS).map((m) => (
          <View key={m.product.id} className="mb-6">
            <PriceHistoryChart product={m.product} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
