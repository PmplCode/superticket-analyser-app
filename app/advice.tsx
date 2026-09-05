import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useStore } from "../store/ticketStore";
import PriceHistoryChart from "../components/PriceHistoryChart";
import { FontAwesome } from "@expo/vector-icons";

const formatPrice = (value: number) => `€${value.toFixed(2)}`;

export default function Insights() {
  const { products, tickets } = useStore();

  const trackedProducts = products.filter((product) => product.prices.length > 1);

  return (
    <ScrollView className="flex-1 bg-slate-50">
      <View className="p-6">
        <Text className="text-2xl font-bold text-slate-900 mb-2">
          Market Insights
        </Text>
        <Text className="text-slate-400 mb-6">
          Tracking {products.length} products across {tickets.length} tickets
        </Text>

        {trackedProducts.length > 0 ? (
          trackedProducts.map((product) => (
            <View key={product.id} className="mb-6">
              <PriceHistoryChart product={product} />
            </View>
          ))
        ) : (
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

        <View className="mt-8">
          <Text className="text-lg font-bold text-slate-900 mb-4">
            Price Watch
          </Text>
          <View className="bg-white rounded-3xl premium-shadow p-6">
            {products.slice(0, 5).map((product) => {
              const pricesByDate = [...product.prices].sort(
                (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
              );
              const latest = pricesByDate[pricesByDate.length - 1];
              const previous = pricesByDate[pricesByDate.length - 2];
              const delta = previous ? latest.price - previous.price : 0;

              return (
                <View
                  key={product.id}
                  className="flex-row justify-between items-center py-3 border-b border-slate-50 last:border-0"
                >
                  <View>
                    <Text className="font-bold text-slate-900">
                      {product.name}
                    </Text>
                    <Text className="text-slate-400 text-xs">
                      {latest.supermarket}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="font-bold text-slate-900">
                      {formatPrice(latest.price)}
                    </Text>
                    {delta !== 0 && (
                      <Text
                        className={`text-[10px] font-bold ${delta > 0 ? "text-red-500" : "text-green-500"}`}
                      >
                        {delta > 0 ? "+" : ""}
                        {delta.toFixed(2)}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
