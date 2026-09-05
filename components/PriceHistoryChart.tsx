import React from "react";
import { View, Text, Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { Product } from "../store/ticketStore";
import { parseDate } from "../utils/dates";

interface Props {
  product: Product;
}

export default function PriceHistoryChart({ product }: Props) {
  const sortedPrices = [...product.prices].sort(
    (a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime()
  );

  const data = {
    labels: sortedPrices.map((p) => {
      const d = parseDate(p.date);
      if (Number.isNaN(d.getTime())) return p.date;
      return `${d.getDate()}/${d.getMonth() + 1}`;
    }),
    datasets: [
      {
        data: sortedPrices.map((p) => p.price),
        color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  return (
    <View className="bg-white p-4 rounded-3xl premium-shadow">
      <Text className="text-slate-900 font-bold mb-4">
        Price Trend: {product.name}
      </Text>
      <LineChart
        data={data}
        width={Dimensions.get("window").width - 80}
        height={220}
        chartConfig={{
          backgroundColor: "#ffffff",
          backgroundGradientFrom: "#ffffff",
          backgroundGradientTo: "#ffffff",
          decimalPlaces: 2,
          color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: "6",
            strokeWidth: "2",
            stroke: "#4f46e5",
          },
        }}
        bezier
        style={{
          marginVertical: 8,
          borderRadius: 16,
        }}
      />
    </View>
  );
}
