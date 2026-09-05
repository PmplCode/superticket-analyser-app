import React from "react";
import { View, Text, ScrollView } from "react-native";
import { useStore } from "../store/ticketStore";
import { FontAwesome } from "@expo/vector-icons";
import { parseDate } from "../utils/dates";

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

const RecentTicketsList = () => {
  const { tickets } = useStore();

  if (tickets.length === 0) {
    return (
      <View className="flex-1 bg-slate-50 p-6">
        <View className="bg-white p-8 rounded-3xl premium-shadow items-center">
          <View className="bg-indigo-50 p-6 rounded-full mb-4">
            <FontAwesome name="shopping-bag" size={32} color="#4f46e5" />
          </View>
          <Text className="text-lg font-bold text-slate-900 mb-2">
            No tickets yet
          </Text>
          <Text className="text-slate-400 text-center">
            Start scanning tickets to build your price history.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-50">
      <View className="p-6">
        {tickets.map((ticket) => (
          <View
            key={ticket.id}
            className="bg-white p-4 rounded-2xl premium-shadow mb-4"
          >
            <View className="flex-row items-center">
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

            {ticket.items.length > 0 && (
              <View className="mt-3 pt-3 border-t border-slate-100">
                <Text className="text-xs text-slate-400 mb-1">
                  {ticket.items.length} item{ticket.items.length === 1 ? "" : "s"}
                </Text>
                <View className="flex-row flex-wrap">
                  {ticket.items.slice(0, 5).map((item, itemIndex) => (
                    <View
                      key={`${ticket.id}-${itemIndex}`}
                      className="bg-slate-50 rounded-full px-3 py-1 mr-1.5 mb-1.5"
                    >
                      <Text className="text-xs text-slate-600">
                        {item.name} · {formatPrice(item.price)}
                      </Text>
                    </View>
                  ))}
                  {ticket.items.length > 5 && (
                    <Text className="text-xs text-slate-400 ml-1 self-center">
                      +{ticket.items.length - 5} more
                    </Text>
                  )}
                </View>
              </View>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default RecentTicketsList;