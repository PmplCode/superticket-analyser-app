import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { Ticket } from "../store/ticketStore";
import { ExtractedTicketData, CATEGORIES, toNumber } from "../utils/receiptSchema";
import { normalizeDateString, todayISODate } from "../utils/dates";
import { formatPrice } from "../utils/format";

interface DraftItem {
  key: string;
  name: string;
  price: string;
  quantity?: number;
  unit?: string;
  category: string;
}

interface Props {
  data: ExtractedTicketData;
  initialSupermarket: string;
  onSave: (ticket: Omit<Ticket, "id" | "imageUri">, detectedName: string) => void;
  onCancel: () => void;
}

const inputClass =
  "bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-slate-900 font-medium";

export default function TicketReview({
  data,
  initialSupermarket,
  onSave,
  onCancel,
}: Props) {
  const [supermarket, setSupermarket] = useState(initialSupermarket);
  const [date, setDate] = useState(normalizeDateString(data.date) || todayISODate());
  const [total, setTotal] = useState(data.total.toFixed(2));
  const [items, setItems] = useState<DraftItem[]>(() =>
    data.items.map((item, i) => ({
      key: `${i}`,
      name: item.name,
      price: item.price.toFixed(2),
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
    }))
  );

  const itemsSum = useMemo(
    () => items.reduce((sum, item) => sum + (toNumber(item.price) ?? 0), 0),
    [items]
  );
  const totalValue = toNumber(total) ?? 0;
  const mismatch = Math.abs(itemsSum - totalValue) > 0.05;

  const update = (key: string, patch: Partial<DraftItem>) =>
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const cycleCategory = (key: string, current: string) => {
    const index = CATEGORIES.indexOf(current as (typeof CATEGORIES)[number]);
    update(key, { category: CATEGORIES[(index + 1) % CATEGORIES.length] });
  };

  const save = () => {
    const name = supermarket.trim();
    if (!name) {
      Alert.alert("Missing supermarket", "Write the supermarket name before saving.");
      return;
    }
    const normalizedDate = normalizeDateString(date);
    if (!normalizedDate) {
      Alert.alert("Invalid date", "Use the format YYYY-MM-DD.");
      return;
    }
    const cleanItems = items
      .map((i) => ({
        name: i.name.trim(),
        price: toNumber(i.price) ?? 0,
        quantity: i.quantity,
        unit: i.unit,
        category: i.category,
      }))
      .filter((i) => i.name && i.price !== 0);
    if (cleanItems.length === 0) {
      Alert.alert("No items", "Add at least one item with a price.");
      return;
    }
    onSave(
      {
        supermarket: name,
        date: normalizedDate,
        items: cleanItems,
        total: totalValue > 0 ? totalValue : itemsSum,
      },
      data.supermarket
    );
  };

  return (
    <View className="bg-white rounded-3xl premium-shadow p-5">
      <Text className="text-slate-900 font-bold text-lg mb-4">Review ticket</Text>

      <Text className="text-slate-500 text-xs mb-1">Supermarket</Text>
      <TextInput
        value={supermarket}
        onChangeText={setSupermarket}
        placeholder="Supermarket name"
        className={`${inputClass} mb-3`}
      />

      <View className="flex-row gap-3 mb-3">
        <View className="flex-1">
          <Text className="text-slate-500 text-xs mb-1">Date (YYYY-MM-DD)</Text>
          <TextInput
            value={date}
            onChangeText={setDate}
            autoCapitalize="none"
            className={inputClass}
          />
        </View>
        <View className="flex-1">
          <Text className="text-slate-500 text-xs mb-1">Total</Text>
          <TextInput
            value={total}
            onChangeText={setTotal}
            keyboardType="decimal-pad"
            className={inputClass}
          />
        </View>
      </View>

      {mismatch && (
        <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
          <Text className="text-amber-800 text-xs">
            Items add up to {formatPrice(itemsSum)} but the total is{" "}
            {formatPrice(totalValue)}. Check prices or missing lines.
          </Text>
        </View>
      )}

      <Text className="text-slate-500 text-xs mb-2">
        {items.length} items · tap the category chip to change it
      </Text>
      <ScrollView style={{ maxHeight: 420 }} nestedScrollEnabled>
        {items.map((item) => (
          <View key={item.key} className="border-b border-slate-100 py-3">
            <View className="flex-row items-center gap-2">
              <TextInput
                value={item.name}
                onChangeText={(name) => update(item.key, { name })}
                className={`${inputClass} flex-1`}
              />
              <TextInput
                value={item.price}
                onChangeText={(price) => update(item.key, { price })}
                keyboardType="numbers-and-punctuation"
                className={inputClass}
                style={{ width: 84, textAlign: "right" }}
              />
              <Pressable
                onPress={() => setItems((p) => p.filter((i) => i.key !== item.key))}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item.name}`}
                className="p-2"
              >
                <FontAwesome name="trash-o" size={18} color="#ef4444" />
              </Pressable>
            </View>
            <Pressable
              onPress={() => cycleCategory(item.key, item.category)}
              accessibilityRole="button"
              accessibilityLabel={`Category ${item.category}, tap to change`}
              className="self-start mt-2 bg-indigo-50 rounded-full px-3 py-1"
            >
              <Text className="text-indigo-700 text-xs font-semibold">
                {item.category}
              </Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      <Pressable
        onPress={() =>
          setItems((p) => [
            ...p,
            { key: `n${Date.now()}`, name: "", price: "", category: "Other" },
          ])
        }
        accessibilityRole="button"
        className="self-start mt-3 mb-4 px-3 py-2"
      >
        <Text className="text-indigo-600 font-semibold">+ Add item</Text>
      </Pressable>

      <Pressable className="btn-primary" onPress={save} accessibilityRole="button">
        <FontAwesome name="save" size={18} color="white" />
        <Text className="btn-text ml-2">Save Ticket</Text>
      </Pressable>
      <Pressable
        onPress={onCancel}
        accessibilityRole="button"
        className="self-center mt-3 px-4 py-2"
      >
        <Text className="text-slate-500 font-semibold">Discard</Text>
      </Pressable>
    </View>
  );
}
