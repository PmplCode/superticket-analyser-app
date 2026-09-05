import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { readAsStringAsync, EncodingType } from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import { useStore, Ticket } from "../store/ticketStore";
import { analyzeReceipt, ExtractedTicketData } from "../utils/openrouter";
import { FontAwesome } from "@expo/vector-icons";
import { normalizeDateString, todayISODate } from "../utils/dates";

const formatPrice = (value: number) => `€${value.toFixed(2)}`;

const sanitizePreviewTotal = (ticket: ExtractedTicketData) => {
  const sumItems = ticket.items.reduce(
    (sum, item) => sum + (Number.isFinite(item.price) ? item.price : 0),
    0
  );
  const moneyTotal =
    Number.isFinite(ticket.total) && ticket.total > 0 && ticket.total < 1_000_000
      ? Math.round(ticket.total * 100) / 100
      : 0;
  return moneyTotal > 0 ? moneyTotal : sumItems;
};

export default function TicketScanner() {
  const [image, setImage] = useState<string | null>(null);
  const [analyzedTicket, setAnalyzedTicket] = useState<ExtractedTicketData | null>(
    null
  );
  const [supermarketInput, setSupermarketInput] = useState("");
  const { addTicket, loading, setLoading, resolveSupermarketName, rememberSupermarketName } =
    useStore();

  React.useEffect(() => {
    setLoading(false);
  }, []);

  const clearSelection = useCallback(() => {
    setImage(null);
    setAnalyzedTicket(null);
    setSupermarketInput("");
  }, []);

  const takePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "We need camera permissions to scan tickets."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        setImage(result.assets[0].uri);
        setAnalyzedTicket(null);
        setSupermarketInput("");
      }
    } catch (e) {
      Alert.alert("Error", "Failed to take photo");
    }
  }, []);

  const pickImage = useCallback(async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "We need access to your gallery.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        setImage(result.assets[0].uri);
        setAnalyzedTicket(null);
        setSupermarketInput("");
      }
    } catch (e) {
      Alert.alert("Error", "Failed to pick image");
    }
  }, []);

  const processImage = useCallback(async () => {
    if (!image) {
      return;
    }

    setLoading(true);

    try {
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        image,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      const base64 = await readAsStringAsync(manipulatedImage.uri, {
        encoding: EncodingType.Base64,
      });
      const dataUri = `data:image/jpeg;base64,${base64}`;

      const result = await analyzeReceipt(dataUri);
      if (result) {
        setAnalyzedTicket(result);
        setSupermarketInput(resolveSupermarketName(result.supermarket));
      } else {
        Alert.alert(
          "Analysis Failed",
          "Could not read ticket. Please try a clearer photo."
        );
      }
    } catch (e) {
      Alert.alert("Error", "Something went wrong during processing.");
    } finally {
      setLoading(false);
    }
  }, [image, resolveSupermarketName, setLoading]);

  const confirmTicket = useCallback(() => {
    if (!image || !analyzedTicket) {
      return;
    }

    const chosenSupermarket = supermarketInput.trim();
    if (!chosenSupermarket) {
      Alert.alert(
        "Missing supermarket",
        "Please write the supermarket name before saving the ticket."
      );
      return;
    }

    rememberSupermarketName(analyzedTicket.supermarket, chosenSupermarket);

    const newTicket: Ticket = {
      id: Math.random().toString(36).substr(2, 9),
      date: normalizeDateString(analyzedTicket.date) || todayISODate(),
      supermarket: chosenSupermarket,
      items: analyzedTicket.items,
      total: analyzedTicket.total,
      imageUri: image,
    };

    const added = addTicket(newTicket);
    clearSelection();

    if (added) {
      Alert.alert("Success", `Added ticket from ${chosenSupermarket}`);
    } else {
      Alert.alert(
        "Duplicate ticket",
        "This ticket looks like one you already scanned, so it was not added again."
      );
    }
  }, [
    addTicket,
    analyzedTicket,
    clearSelection,
    image,
    rememberSupermarketName,
    supermarketInput,
  ]);

  return (
    <View className="p-6">
      <View className="glass-card p-6 mb-6 items-center">
        {image ? (
          <View className="w-full rounded-xl mb-4 bg-emerald-50 border border-emerald-100 p-5">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-emerald-800 font-bold text-base">
                  Ticket selected
                </Text>
                <Text className="text-emerald-700 text-sm mt-1">
                  {analyzedTicket
                    ? "Review the store name and save the ticket."
                    : "Your photo is ready to analyze."}
                </Text>
              </View>
              <View className="bg-emerald-100 p-3 rounded-full">
                <FontAwesome
                  name={analyzedTicket ? "pencil" : "check"}
                  size={18}
                  color="#047857"
                />
              </View>
            </View>
            <Pressable
              onPress={clearSelection}
              className="self-start mt-4 bg-white px-3 py-2 rounded-lg border border-emerald-200"
            >
              <Text className="text-emerald-700 font-semibold">Remove</Text>
            </Pressable>
          </View>
        ) : (
          <View className="w-full h-64 rounded-xl border-2 border-dashed border-slate-300 items-center justify-center bg-slate-50 mb-4">
            <FontAwesome name="ticket" size={48} color="#94a3b8" />
            <Text className="text-slate-400 mt-2 font-medium">
              No ticket selected
            </Text>
          </View>
        )}

        <View className="flex-row gap-3 w-full">
          <Pressable
            onPress={takePhoto}
            className="flex-1 bg-white border border-slate-200 p-4 rounded-xl flex-row items-center justify-center"
          >
            <FontAwesome name="camera" size={18} color="#475569" />
            <Text className="text-slate-600 font-semibold ml-2">Camera</Text>
          </Pressable>

          <Pressable
            onPress={pickImage}
            className="flex-1 bg-white border border-slate-200 p-4 rounded-xl flex-row items-center justify-center"
          >
            <FontAwesome name="image" size={18} color="#475569" />
            <Text className="text-slate-600 font-semibold ml-2">Gallery</Text>
          </Pressable>
        </View>
      </View>

      {image && !analyzedTicket && (
        <Pressable
          className={`btn-primary ${loading ? "opacity-70" : ""}`}
          onPress={processImage}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" className="mr-2" />
          ) : (
            <FontAwesome
              name="magic"
              size={18}
              color="white"
              className="mr-2"
            />
          )}
          <Text className="btn-text ml-2">
            {loading ? "Analyzing..." : "Analyze Ticket"}
          </Text>
        </Pressable>
      )}

      {analyzedTicket && (
        <View className="bg-white rounded-3xl premium-shadow p-5">
          <Text className="text-slate-900 font-bold text-lg mb-4">
            Confirm supermarket
          </Text>

          <Text className="text-slate-500 text-xs mb-2">Supermarket name</Text>
          <TextInput
            value={supermarketInput}
            onChangeText={setSupermarketInput}
            placeholder="Write the supermarket name"
            className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-slate-900 font-medium mb-4"
          />

          <View className="bg-slate-50 rounded-2xl p-4 mb-4">
            <Text className="text-slate-500 text-xs mb-2">Scanned summary</Text>
            <View className="flex-row justify-between mb-2">
              <Text className="text-slate-500">Detected name</Text>
              <Text className="font-semibold text-slate-900 flex-1 text-right">
                {analyzedTicket.supermarket}
              </Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-slate-500">Date</Text>
              <Text className="font-semibold text-slate-900">
                {normalizeDateString(analyzedTicket.date) || todayISODate()}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-slate-500">Items / total</Text>
              <Text className="font-semibold text-slate-900">
                {analyzedTicket.items.length} items · {formatPrice(sanitizePreviewTotal(analyzedTicket))}
              </Text>
            </View>
          </View>

          <Pressable className="btn-primary" onPress={confirmTicket}>
            <FontAwesome name="save" size={18} color="white" className="mr-2" />
            <Text className="btn-text ml-2">Save Ticket</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
