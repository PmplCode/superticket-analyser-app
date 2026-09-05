import React from "react";
import { View, Text, ScrollView } from "react-native";
import { useStore } from "../store/ticketStore";

const formatPrice = (value: number) => `€${value.toFixed(2)}`;

export default function AdviceDisplay() {
  const { currentTicket } = useStore();

  return (
    <ScrollView className="flex-1 p-4 bg-gray-100">
      <Text className="text-2xl font-bold mb-4 text-center">
        Latest Receipt
      </Text>

      {currentTicket ? (
        <>
          <View className="bg-white p-4 rounded-lg mb-4 shadow">
            <Text className="text-lg font-semibold text-gray-800">
              {currentTicket.supermarket}
            </Text>
            <Text className="text-base text-gray-500 mb-3">
              {currentTicket.date}
            </Text>
            {currentTicket.items.map((item, index) => (
              <View
                key={`${item.name}-${index}`}
                className="flex-row justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <View className="pr-3">
                  <Text className="text-base text-gray-700">{item.name}</Text>
                  <Text className="text-xs text-gray-400">{item.category}</Text>
                </View>
                <Text className="font-semibold text-gray-800">
                  {formatPrice(item.price)}
                </Text>
              </View>
            ))}
          </View>

          <View className="bg-green-100 p-4 rounded-lg shadow">
            <Text className="text-lg font-semibold text-green-800">
              Ticket total
            </Text>
            <Text className="text-base text-green-700">
              {formatPrice(currentTicket.total)}
            </Text>
          </View>
        </>
      ) : (
        <Text className="text-base text-gray-500 mb-4 text-center">
          No receipt data yet.
        </Text>
      )}
    </ScrollView>
  );
}
