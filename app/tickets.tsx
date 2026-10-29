import React from "react";
import { View, Text, FlatList, Pressable, Alert } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { Ticket, useStore } from "../store/ticketStore";
import { formatDate, formatPrice } from "../utils/format";

const TicketCard = React.memo(function TicketCard({
  ticket,
  onDelete,
}: {
  ticket: Ticket;
  onDelete: (ticket: Ticket) => void;
}) {
  return (
    <View className="bg-white p-4 rounded-2xl premium-shadow mb-4">
      <View className="flex-row items-center">
        <View className="bg-slate-100 p-3 rounded-xl mr-4">
          <FontAwesome name="shopping-bag" size={20} color="#64748b" />
        </View>
        <View className="flex-1">
          <Text className="font-bold text-slate-900">{ticket.supermarket}</Text>
          <Text className="text-slate-400 text-xs">{formatDate(ticket.date)}</Text>
        </View>
        <Text className="font-bold text-slate-900 mr-2">{formatPrice(ticket.total)}</Text>
        <Pressable
          onPress={() => onDelete(ticket)}
          accessibilityRole="button"
          accessibilityLabel={`Delete ticket from ${ticket.supermarket}`}
          className="p-2"
        >
          <FontAwesome name="trash-o" size={18} color="#94a3b8" />
        </Pressable>
      </View>

      {ticket.items.length > 0 && (
        <View className="mt-3 pt-3 border-t border-slate-100">
          <Text className="text-xs text-slate-400 mb-1">
            {ticket.items.length} item{ticket.items.length === 1 ? "" : "s"}
          </Text>
          <View className="flex-row flex-wrap">
            {ticket.items.slice(0, 5).map((item, i) => (
              <View
                key={`${ticket.id}-${i}`}
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
  );
});

export default function RecentTicketsList() {
  const tickets = useStore((s) => s.tickets);
  const deleteTicket = useStore((s) => s.deleteTicket);

  const confirmDelete = React.useCallback(
    (ticket: Ticket) => {
      Alert.alert(
        "Delete ticket?",
        `${ticket.supermarket} · ${formatPrice(ticket.total)}`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => deleteTicket(ticket.id) },
        ]
      );
    },
    [deleteTicket]
  );

  return (
    <FlatList
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ padding: 24 }}
      data={tickets}
      keyExtractor={(t) => t.id}
      renderItem={({ item }) => <TicketCard ticket={item} onDelete={confirmDelete} />}
      ListEmptyComponent={
        <View className="bg-white p-8 rounded-3xl premium-shadow items-center">
          <View className="bg-indigo-50 p-6 rounded-full mb-4">
            <FontAwesome name="shopping-bag" size={32} color="#4f46e5" />
          </View>
          <Text className="text-lg font-bold text-slate-900 mb-2">No tickets yet</Text>
          <Text className="text-slate-400 text-center">
            Start scanning tickets to build your price history.
          </Text>
        </View>
      }
    />
  );
}
