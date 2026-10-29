import React, { useDeferredValue, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, Text, TextInput, View } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Product,
  ProductSearchResult,
  ProductSortMode,
  searchProducts,
} from "../store/ticketStore";
import { formatDate, formatPrice } from "../utils/format";

const sortOptions: { label: string; value: ProductSortMode }[] = [
  { label: "Cheapest", value: "lowest-price" },
  { label: "Latest price", value: "latest-price" },
  { label: "Recent", value: "recent-purchase" },
];

const ResultRow = ({ item }: { item: ProductSearchResult }) => {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/product/${item.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, lowest ${formatPrice(item.lowestPrice.price)} at ${item.lowestPrice.supermarket}`}
      className="py-4 border-b border-slate-50"
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1 pr-3">
          <Text className="font-bold text-slate-900 text-base">{item.name}</Text>
          <Text className="text-slate-400 text-xs">{item.category}</Text>
          <Text className="text-xs text-slate-500 mt-2">
            Cheapest at {item.lowestPrice.supermarket} on{" "}
            {formatDate(item.lowestPrice.date)} · seen in {item.storeCount} store
            {item.storeCount === 1 ? "" : "s"}
          </Text>
        </View>
        <View className="items-end">
          <Text className="font-bold text-slate-900">
            {formatPrice(item.latestPrice.price)}
          </Text>
          <Text className="text-[11px] text-slate-400">latest</Text>
        </View>
      </View>
    </Pressable>
  );
};

export default function ProductSearch({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<ProductSortMode>("lowest-price");
  const [category, setCategory] = useState("All");
  const [pickerVisible, setPickerVisible] = useState(false);
  const deferredQuery = useDeferredValue(query);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort()],
    [products]
  );

  const results = useMemo(() => {
    const found = searchProducts(products, deferredQuery, sortMode);
    return category === "All" ? found : found.filter((p) => p.category === category);
  }, [products, deferredQuery, sortMode, category]);

  return (
    <View>
      <View className="flex-row items-center gap-2.5 mb-4">
        <View className="flex-1 flex-row items-center bg-white px-4 py-3.5 rounded-2xl premium-shadow">
          <FontAwesome name="search" size={18} color="#94a3b8" />
          <TextInput
            placeholder="Search products..."
            accessibilityLabel="Search products"
            className="flex-1 ml-3 text-slate-900 font-medium"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
        </View>
        <Pressable
          onPress={() => setPickerVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={`Category filter: ${category}`}
          className="flex-row items-center justify-center bg-white px-4 py-3.5 rounded-2xl premium-shadow"
          style={{ width: 128 }}
        >
          <Text className="text-slate-700 font-medium" numberOfLines={1} style={{ flexShrink: 1 }}>
            {category}
          </Text>
          <FontAwesome name="chevron-down" size={12} color="#64748b" style={{ marginLeft: 6 }} />
        </Pressable>
      </View>

      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setPickerVisible(false)}>
          <Pressable onPress={() => {}} className="bg-white rounded-t-3xl p-6 pb-8" style={{ maxHeight: "70%" }}>
            <Text className="text-lg font-bold text-slate-900 mb-4">Select category</Text>
            <FlatList
              data={categories}
              keyExtractor={(c) => c}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setCategory(item);
                    setPickerVisible(false);
                  }}
                  className="flex-row items-center justify-between py-3.5 border-b border-slate-50"
                >
                  <Text className={`font-medium ${item === category ? "text-indigo-600" : "text-slate-900"}`}>
                    {item}
                  </Text>
                  {item === category && <FontAwesome name="check" size={16} color="#4f46e5" />}
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <View className="flex-row flex-wrap">
        {sortOptions.map((option) => {
          const selected = option.value === sortMode;
          return (
            <Pressable
              key={option.value}
              onPress={() => setSortMode(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              className={`mr-3 mb-2 px-4 py-2 rounded-full border ${
                selected ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"
              }`}
            >
              <Text className={`font-semibold ${selected ? "text-white" : "text-slate-600"}`}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {query.trim().length > 0 && (
        <View className="mt-2 bg-white rounded-2xl px-4 premium-shadow">
          {results.length > 0 ? (
            results.slice(0, 30).map((item) => <ResultRow key={item.id} item={item} />)
          ) : (
            <Text className="text-center text-slate-400 py-6">No products found</Text>
          )}
        </View>
      )}
    </View>
  );
}
