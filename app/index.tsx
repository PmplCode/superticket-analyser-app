import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
} from "react-native";
import TicketScanner from "../components/TicketScanner";
import {
  ProductPrice,
  ProductSearchResult,
  ProductSortMode,
  useStore,
} from "../store/ticketStore";
import { FontAwesome } from "@expo/vector-icons";
import PriceHistoryChart from "../components/PriceHistoryChart";

const formatPrice = (value: number) => `€${value.toFixed(2)}`;

const formatDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
};

const getSavingsLabel = (product: ProductSearchResult) => {
  const savings = product.latestPrice.price - product.lowestPrice.price;
  return savings <= 0
    ? "At best price now"
    : `${formatPrice(savings)} above best`;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<ProductSortMode>("lowest-price");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );

  const searchResults = searchProducts(searchQuery, sortMode);

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
            setSelectedProductId(null);
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
          <View className="flex-row items-center bg-white px-4 py-4 rounded-2xl premium-shadow">
            <FontAwesome name="search" size={18} color="#94a3b8" />
            <TextInput
              placeholder="Search products..."
              className="flex-1 ml-3 text-slate-900 font-medium"
              value={searchQuery}
              onChangeText={(value) => {
                setSearchQuery(value);
                if (!value.trim()) {
                  setSelectedProductId(null);
                }
              }}
            />
          </View>

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
              {searchResults.length > 0 ? (
                searchResults.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() =>
                      setSelectedProductId((current) =>
                        current === item.id ? null : item.id
                      )
                    }
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
                      </View>

                      <View className="items-end">
                        <Text className="font-bold text-emerald-600 text-base">
                          {formatPrice(item.lowestPrice.price)}
                        </Text>
                        <Text className="text-[11px] text-slate-400">
                          Latest {formatPrice(item.latestPrice.price)}
                        </Text>
                        <Text className="text-[11px] text-slate-400 mt-1">
                          {getSavingsLabel(item)}
                        </Text>
                      </View>
                    </View>

                    {selectedProductId === item.id && (
                      <View className="mt-4 pt-4 border-t border-slate-100">
                        <View className="bg-slate-50 rounded-2xl p-4 mb-4">
                          <Text className="text-slate-900 font-bold mb-3">
                            Price summary
                          </Text>
                          <View className="flex-row justify-between mb-2">
                            <Text className="text-slate-500">Best price</Text>
                            <Text className="font-semibold text-slate-900">
                              {formatPrice(item.lowestPrice.price)} at{" "}
                              {item.lowestPrice.supermarket}
                            </Text>
                          </View>
                          <View className="flex-row justify-between mb-2">
                            <Text className="text-slate-500">Latest purchase</Text>
                            <Text className="font-semibold text-slate-900">
                              {formatDate(item.latestPrice.date)}
                            </Text>
                          </View>
                          <View className="flex-row justify-between">
                            <Text className="text-slate-500">Stores tracked</Text>
                            <Text className="font-semibold text-slate-900">
                              {item.supermarkets.join(", ")}
                            </Text>
                          </View>
                        </View>

                        {item.prices.length > 1 && (
                          <View className="mb-4">
                            <PriceHistoryChart product={item} />
                          </View>
                        )}

                        <Text className="text-slate-900 font-bold mb-2">
                          Purchase history
                        </Text>
                        <View className="bg-slate-50 rounded-2xl px-4">
                          {[...item.prices]
                            .sort(
                              (a, b) =>
                                new Date(b.date).getTime() -
                                new Date(a.date).getTime()
                            )
                            .map(renderPriceRow)}
                        </View>
                      </View>
                    )}
                  </Pressable>
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
            <Pressable>
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
