import React, { useMemo } from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { Product } from "../store/ticketStore";
import { parseDate } from "../utils/dates";
import { sortPricesByDate } from "../utils/insights";
import { formatPrice } from "../utils/format";

interface Props {
  product: Product;
  title?: string;
}

export default function PriceHistoryChart({ product, title }: Props) {
  const { width } = useWindowDimensions();
  const sortedPrices = useMemo(() => sortPricesByDate(product.prices), [product.prices]);

  if (sortedPrices.length < 2) return null;

  // Thin the labels so they never overlap.
  const step = Math.ceil(sortedPrices.length / 5);
  const data = {
    labels: sortedPrices.map((p, i) => {
      if (i % step !== 0) return "";
      const d = parseDate(p.date);
      return Number.isNaN(d.getTime()) ? "" : `${d.getDate()}/${d.getMonth() + 1}`;
    }),
    datasets: [
      {
        data: sortedPrices.map((p) => p.price),
        color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  const first = sortedPrices[0].price;
  const last = sortedPrices[sortedPrices.length - 1].price;
  const summary = `${product.name}: ${sortedPrices.length} prices, from ${formatPrice(
    first
  )} to ${formatPrice(last)}`;

  return (
    <View
      className="bg-white p-4 rounded-3xl premium-shadow"
      accessible
      accessibilityLabel={summary}
    >
      <Text className="text-slate-900 font-bold mb-2">
        {title ?? `Price trend: ${product.name}`}
      </Text>
      <LineChart
        data={data}
        width={Math.max(width - 80, 200)}
        height={200}
        chartConfig={{
          backgroundColor: "#ffffff",
          backgroundGradientFrom: "#ffffff",
          backgroundGradientTo: "#ffffff",
          decimalPlaces: 2,
          color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
          style: { borderRadius: 16 },
          propsForDots: { r: "5", strokeWidth: "2", stroke: "#4f46e5" },
        }}
        bezier
        style={{ marginVertical: 8, borderRadius: 16 }}
      />
    </View>
  );
}
