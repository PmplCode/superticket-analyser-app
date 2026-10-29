import React, { useMemo } from "react";
import { View, Text, ScrollView } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useStore } from "../../store/ticketStore";
import PriceHistoryChart from "../../components/PriceHistoryChart";
import { sortPricesByDate } from "../../utils/insights";
import { formatDate, formatPrice } from "../../utils/format";

const UNIT_LABEL = { kg: "kg", l: "L", unit: "unit" } as const;

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const products = useStore((s) => s.products);
  const product = useMemo(() => products.find((p) => p.id === id), [products, id]);

  if (!product) {
    return (
      <View className="flex-1 bg-slate-50 p-6">
        <Stack.Screen options={{ title: "Product" }} />
        <Text className="text-slate-400">Product not found.</Text>
      </View>
    );
  }

  const prices = sortPricesByDate(product.prices);
  const history = [...prices].reverse();
  const byPrice = [...prices].sort((a, b) => a.price - b.price);
  const lowest = byPrice[0];
  const highest = byPrice[byPrice.length - 1];
  const latest = prices[prices.length - 1];
  const average = prices.reduce((s, p) => s + p.price, 0) / prices.length;

  const stats: { label: string; value: string; hint?: string }[] = [
    { label: "Latest", value: formatPrice(latest.price), hint: latest.supermarket },
    { label: "Lowest", value: formatPrice(lowest.price), hint: lowest.supermarket },
    { label: "Highest", value: formatPrice(highest.price), hint: highest.supermarket },
    { label: "Average", value: formatPrice(average), hint: `${prices.length} purchases` },
  ];

  const verdict =
    prices.length < 2
      ? null
      : latest.price <= lowest.price * 1.02
      ? "Latest price is at its lowest. Good time to buy."
      : latest.price >= average * 1.1
      ? `Latest price is above your average. Cheapest seen at ${lowest.supermarket}.`
      : "Latest price is close to your average.";

  return (
    <ScrollView className="flex-1 bg-slate-50">
      <Stack.Screen options={{ title: product.name }} />
      <View className="p-6">
        <Text className="text-2xl font-bold text-slate-900">{product.name}</Text>
        <Text className="text-slate-400 mb-5">{product.category}</Text>

        <View className="flex-row flex-wrap -mx-1 mb-4">
          {stats.map((s) => (
            <View key={s.label} className="w-1/2 p-1">
              <View className="bg-white rounded-2xl p-4 premium-shadow">
                <Text className="text-slate-400 text-xs">{s.label}</Text>
                <Text className="text-xl font-bold text-slate-900">{s.value}</Text>
                {s.hint ? (
                  <Text className="text-xs text-slate-400" numberOfLines={1}>
                    {s.hint}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>

        {verdict && (
          <View className="bg-indigo-50 rounded-2xl p-4 mb-4">
            <Text className="text-indigo-800 font-medium">{verdict}</Text>
          </View>
        )}

        <View className="mb-6">
          <PriceHistoryChart product={product} title="Price history" />
        </View>

        <Text className="text-lg font-bold text-slate-900 mb-3">Purchases</Text>
        <View className="bg-white rounded-3xl premium-shadow px-5">
          {history.map((p, index) => (
            <View
              key={`${p.date}-${p.supermarket}-${index}`}
              className="flex-row justify-between items-center py-3 border-b border-slate-50"
            >
              <View className="flex-1 pr-3">
                <Text className="font-semibold text-slate-900">{p.supermarket}</Text>
                <Text className="text-xs text-slate-400">{formatDate(p.date)}</Text>
              </View>
              <View className="items-end">
                <Text className="font-bold text-slate-900">{formatPrice(p.price)}</Text>
                {p.unitPrice !== undefined && p.unit && (
                  <Text className="text-[11px] text-slate-400">
                    {formatPrice(p.unitPrice)}/{UNIT_LABEL[p.unit]}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
