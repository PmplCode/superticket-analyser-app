import React, { useState } from "react";
import { Alert, Modal, Pressable, Share, Text, TextInput, View } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useStore } from "../store/ticketStore";
import { ticketsFromJson, ticketsToCsv, ticketsToJson } from "../utils/exportData";

const Action = ({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof FontAwesome.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
    className="flex-row items-center py-3"
  >
    <FontAwesome name={icon} size={16} color={danger ? "#dc2626" : "#475569"} />
    <Text className={`ml-3 font-medium ${danger ? "text-red-600" : "text-slate-700"}`}>
      {label}
    </Text>
  </Pressable>
);

export default function DataTools() {
  const tickets = useStore((s) => s.tickets);
  const importData = useStore((s) => s.importData);
  const resetData = useStore((s) => s.resetData);
  const [importVisible, setImportVisible] = useState(false);
  const [importText, setImportText] = useState("");

  const share = async (message: string, title: string) => {
    if (tickets.length === 0) {
      Alert.alert("Nothing to export", "Scan a ticket first.");
      return;
    }
    try {
      await Share.share({ message, title });
    } catch {
      Alert.alert("Error", "Could not open the share sheet.");
    }
  };

  const runImport = () => {
    const parsed = ticketsFromJson(importText);
    if (!parsed) {
      Alert.alert("Invalid backup", "Paste the JSON exported from SuperTicket.");
      return;
    }
    const added = importData(parsed);
    setImportVisible(false);
    setImportText("");
    Alert.alert("Import finished", `${added} new ticket${added === 1 ? "" : "s"} added.`);
  };

  const confirmReset = () =>
    Alert.alert(
      "Clear all data?",
      "This permanently removes every scanned ticket, product and price history. Export a backup first if you need it.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear all", style: "destructive", onPress: resetData },
      ]
    );

  return (
    <View className="bg-white rounded-3xl premium-shadow px-5 py-2">
      <Action
        icon="download"
        label="Export backup (JSON)"
        onPress={() => share(ticketsToJson(tickets), "SuperTicket backup")}
      />
      <Action
        icon="table"
        label="Export items (CSV)"
        onPress={() => share(ticketsToCsv(tickets), "SuperTicket items")}
      />
      <Action icon="upload" label="Import backup" onPress={() => setImportVisible(true)} />
      <Action icon="trash-o" label="Clear all data" onPress={confirmReset} danger />

      <Modal
        visible={importVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setImportVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl p-6 pb-8">
            <Text className="text-lg font-bold text-slate-900 mb-3">Import backup</Text>
            <TextInput
              value={importText}
              onChangeText={setImportText}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Paste backup JSON here"
              className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900"
              style={{ minHeight: 160, textAlignVertical: "top" }}
            />
            <View className="flex-row gap-3 mt-4">
              <Pressable
                onPress={() => setImportVisible(false)}
                className="flex-1 items-center py-3 rounded-xl border border-slate-200"
              >
                <Text className="font-semibold text-slate-600">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={runImport}
                className="flex-1 items-center py-3 rounded-xl bg-indigo-600"
              >
                <Text className="font-semibold text-white">Import</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
