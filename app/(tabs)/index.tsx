import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  Modal,
} from "react-native";
import TicketScanner from "../../components/TicketScanner";
import {
  ProductPrice,
  ProductSearchResult,
  ProductSortMode,
  useStore,
} from "../../store/ticketStore";
import { FontAwesome } from "@expo/vector-icons";
import PriceHistoryChart from "../../components/PriceHistoryChart";
import { useRouter } from "expo-router";
import { parseDate, getDateTimestamp } from "../../utils/dates";

const formatPrice = (value: number) => `€${value.toFixed(2)}`;

const formatDate = (value: string) => {
  const parsed = parseDate(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
};

const sortOptions: { label: string; value: ProductSortMode }[] = [
  { label: "Cheapest", value: "lowest-price" },
  { label: "Latest price", value: "latest-price" },
  { label: "Recent", value: "recent-purchase" },
];

const ProductMeta = ({
  icon,
  label,
  value,
}: {
  icon: keyof typeof FontAwesome.glyphMap;
  label: string;
  value: string;
}) => (
  <View className="flex-row items-center mr-4 mb-2">
    <FontAwesome name={icon} size={12} color="#64748b" />
    <Text className="text-xs text-slate-500 ml-2">
      {label}: {value}
    </Text>
  </View>
);

export default function Dashboard() {
  const { tickets, products, searchProducts, resetData } = useStore();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<ProductSortMode>("lowest-price");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);

  const categories = useMemo(() => {
    const categorySet = new Set<string>();
    products.forEach((product) => {
      if (product.category) {
        categorySet.add(product.category);
      }
    });
    const all = ["All", ...Array.from(categorySet)].sort();
    return all;
  }, [products]);

  const searchResults = searchProducts(searchQuery, sortMode);

  const filteredSearchResults = useMemo(() => {
    if (selectedCategory === "All") {
      return searchResults;
    }
    return searchResults.filter(
      (item) => item.category === selectedCategory
    );
  }, [searchResults, selectedCategory]);

  const cheapestProducts = useMemo(
    () =>
      products
        .map((product) => {
          const cheapestEntry = [...product.prices].sort(
            (a, b) => a.price - b.price
          )[0];

          return {
            id: product.id,
            name: product.name,
            price: cheapestEntry?.price ?? 0,
            supermarket: cheapestEntry?.supermarket ?? "Unknown",
          };
        })
        .sort((a, b) => a.price - b.price)
        .slice(0, 3),
    [products]
  );

  const topSupermarkets = useMemo(() => {
    const counts = tickets.reduce<Record<string, number>>((acc, ticket) => {
      acc[ticket.supermarket] = (acc[ticket.supermarket] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [tickets]);

  const renderPriceRow = (price: ProductPrice, index: number) => (
    <View
      key={`${price.supermarket}-${price.date}-${price.price}-${index}`}
      className="flex-row justify-between items-center py-3 border-b border-slate-100 last:border-0"
    >
      <View className="flex-1 pr-3">
        <Text className="font-semibold text-slate-900">{price.supermarket}</Text>
        <Text className="text-xs text-slate-400">
          Bought on {formatDate(price.date)}
        </Text>
      </View>
      <Text className="font-bold text-slate-900">{formatPrice(price.price)}</Text>
    </View>
  );

  const handleResetData = () => {
    Alert.alert(
      "Clear all data?",
      "This will remove every scanned ticket, product, and price history from the app.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear all",
          style: "destructive",
          onPress: () => {
            resetData();
            setSearchQuery("");
          },
        },
      ]
    );
  };

  return (
    <ScrollView className="flex-1 bg-slate-50">
      <View className="p-6">
        <View className="flex-row justify-between items-end mb-6">
          <View>
            <Text className="text-slate-400 font-medium">Welcome back</Text>
            <Text className="text-3xl font-bold text-slate-900">
              Superticket
            </Text>
          </View>
          <Pressable
            onPress={handleResetData}
            className="bg-indigo-100 p-3 rounded-2xl"
          >
            <FontAwesome name="user-o" size={20} color="#4f46e5" />
          </Pressable>
        </View>

        <View className="flex-row gap-4 mb-8">
          <View className="flex-1 bg-indigo-600 p-5 rounded-3xl premium-shadow">
            <Text className="text-indigo-100 font-medium mb-1">Tickets</Text>
            <Text className="text-3xl font-bold text-white">
              {tickets.length}
            </Text>
          </View>
          <View className="flex-1 bg-white p-5 rounded-3xl premium-shadow">
            <Text className="text-slate-400 font-medium mb-1">Products</Text>
            <Text className="text-3xl font-bold text-slate-900">
              {products.length}
            </Text>
          </View>
        </View>

        <View className="mb-8">
          <Text className="text-lg font-bold text-slate-900 mb-4">
            Track Prices
          </Text>
          <View className="flex-row items-center gap-2.5 mb-4">
            <View className="flex-1 flex-row items-center bg-white px-4 py-3.5 rounded-2xl premium-shadow">
              <FontAwesome name="search" size={18} color="#94a3b8" />
              <TextInput
                placeholder="Search products..."
                className="flex-1 ml-3 text-slate-900 font-medium"
                value={searchQuery}
                onChangeText={(value) => {
                  setSearchQuery(value);
                }}
              />
            </View>

            <Pressable
              onPress={() => setCategoryPickerVisible(true)}
              className="flex-row items-center justify-center bg-white px-4 py-3.5 rounded-2xl premium-shadow"
              style={{ width: 128 }}
            >
              <Text
                className="text-slate-700 font-medium"
                numberOfLines={1}
                style={{ flexShrink: 1 }}
              >
                {selectedCategory}
              </Text>
              <FontAwesome
                name="chevron-down"
                size={12}
                color="#64748b"
                style={{ marginLeft: 6 }}
              />
            </Pressable>
          </View>

            <Modal
              visible={categoryPickerVisible}
              transparent
              animationType="fade"
              onRequestClose={() => setCategoryPickerVisible(false)}
            >
              <Pressable
                className="flex-1 justify-end bg-black/40"
                onPress={() => setCategoryPickerVisible(false)}
              >
                <Pressable
                  onPress={() => {}}
                  className="bg-white rounded-t-3xl p-6 pb-8"
                >
                  <Text className="text-lg font-bold text-slate-900 mb-4">
                    Select category
                  </Text>
                  {categories.map((category) => {
                    const isSelected = selectedCategory === category;
                    return (
                      <Pressable
                        key={category}
                        onPress={() => {
                          setSelectedCategory(category);
                          setCategoryPickerVisible(false);
                        }}
                        className="flex-row items-center justify-between py-3.5 border-b border-slate-50"
                      >
                        <Text
                          className={`font-medium ${
                            isSelected ? "text-indigo-600" : "text-slate-900"
                          }`}
                        >
                          {category}
                        </Text>
                        {isSelected && (
                          <FontAwesome name="check" size={16} color="#4f46e5" />
                        )}
                      </Pressable>
                    );
                  })}
                </Pressable>
              </Pressable>
            </Modal>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-4"
          >
            {sortOptions.map((option) => {
              const selected = option.value === sortMode;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => setSortMode(option.value)}
                  className={`mr-3 px-4 py-2 rounded-full border ${
                    selected
                      ? "bg-indigo-600 border-indigo-600"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <Text
                    className={`font-semibold ${
                      selected ? "text-white" : "text-slate-600"
                    }`}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {searchQuery.length > 0 && (
            <View className="mt-4 bg-white rounded-2xl p-4 premium-shadow">
              {filteredSearchResults.length > 0 ? (
                filteredSearchResults.map((item) => (
                  <View
                    key={item.id}
                    className="py-4 border-b border-slate-50 last:border-0"
                  >
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1 pr-4">
                        <Text className="font-bold text-slate-900 text-base">
                          {item.name}
                        </Text>
                        <Text className="text-slate-400 text-xs mb-3">
                          {item.category}
                        </Text>

                        <View className="flex-row flex-wrap">
                          <ProductMeta
                            icon="calendar"
                            label="Cheapest"
                            value={formatDate(item.lowestPrice.date)}
                          />
                          <ProductMeta
                            icon="shopping-cart"
                            label="Store"
                            value={item.lowestPrice.supermarket}
                          />
                          <ProductMeta
                            icon="database"
                            label="Seen in"
                            value={`${item.storeCount} store${item.storeCount === 1 ? "" : "s"}`}
                          />
                        </View>

                        {item.prices
                          .slice()
                          .sort((a, b) => getDateTimestamp(b.date) - getDateTimestamp(a.date))
                          .map((price, index) => (
                            <View key={`${item.id}-${index}`} className="py-2">
                              <View className="flex-row justify-between items-center">
                                <Text className="text-sm text-slate-600">
                                  {price.supermarket}
                                  <Text className="text-slate-400">
                                    {" · "}
                                    {formatDate(price.date)}
                                  </Text>
                                </Text>
                                <Text className="font-semibold text-slate-900 text-sm">
                                  {formatPrice(price.price)}
                                </Text>
                              </View>
                              {price.unitPrice !== undefined && (
                                <Text className="text-[11px] text-slate-400 mt-0.5">
                                  {formatPrice(price.unitPrice)}/{price.unit || "each"}
                                </Text>
                              )}
                            </View>
                          ))}
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <Text className="text-center text-slate-400 py-4">
                  No products found
                </Text>
              )}
            </View>
          )}
        </View>

        <View className="mb-8">
          <Text className="text-lg font-bold text-slate-900 mb-4">
            Smart Shortcuts
          </Text>

          <View className="flex-row gap-4 mb-4">
            <View className="flex-1 bg-white rounded-3xl p-5 premium-shadow">
              <Text className="text-slate-400 font-medium mb-2">
                Cheapest tracked
              </Text>
              {cheapestProducts.length > 0 ? (
                cheapestProducts.map((product) => (
                  <View key={product.id} className="mb-3 last:mb-0">
                    <Text className="font-bold text-slate-900">{product.name}</Text>
                    <Text className="text-xs text-slate-400">
                      {formatPrice(product.price)} at {product.supermarket}
                    </Text>
                  </View>
                ))
              ) : (
                <Text className="text-slate-400">Scan a few tickets first</Text>
              )}
            </View>

            <View className="flex-1 bg-white rounded-3xl p-5 premium-shadow">
              <Text className="text-slate-400 font-medium mb-2">
                Favorite stores
              </Text>
              {topSupermarkets.length > 0 ? (
                topSupermarkets.map(([supermarket, count]) => (
                  <View key={supermarket} className="mb-3 last:mb-0">
                    <Text className="font-bold text-slate-900">{supermarket}</Text>
                    <Text className="text-xs text-slate-400">
                      {count} ticket{count === 1 ? "" : "s"} scanned
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
            <Text className="text-lg font-bold text-slate-900">
              Recent Tickets
            </Text>
            <Pressable onPress={() => router.push("/tickets")}>
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
                  <Text className="font-bold text-slate-900">
                    {ticket.supermarket}
                  </Text>
                  <Text className="text-slate-400 text-xs">
                    {formatDate(ticket.date)}
                  </Text>
                </View>
                <Text className="font-bold text-slate-900">
                  {formatPrice(ticket.total)}
                </Text>
              </View>
            ))
          ) : (
            <View className="bg-slate-100 p-8 rounded-3xl items-center">
              <Text className="text-slate-400 font-medium">
                No tickets yet. Start scanning!
              </Text>
            </View>
          )}
        </View>

        <Text className="text-lg font-bold text-slate-900 mb-4">
          Add New Ticket
        </Text>
        <View className="bg-white rounded-3xl premium-shadow overflow-hidden">
          <TicketScanner />
        </View>
      </View>
    </ScrollView>
  );
}
