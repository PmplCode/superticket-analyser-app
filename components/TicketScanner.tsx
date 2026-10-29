import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  readAsStringAsync,
  copyAsync,
  makeDirectoryAsync,
  getInfoAsync,
  documentDirectory,
  EncodingType,
} from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import { FontAwesome } from "@expo/vector-icons";
import { newId, Ticket, useStore } from "../store/ticketStore";
import {
  analyzeReceipt,
  ExtractedTicketData,
  ReceiptAnalysisError,
} from "../utils/openrouter";
import TicketReview from "./TicketReview";

const IMAGE_DIR = `${documentDirectory ?? ""}receipts/`;

/** Copies the picker's cache file somewhere the OS will not purge. */
const persistImage = async (uri: string): Promise<string | undefined> => {
  if (!documentDirectory) return undefined;
  try {
    const dir = await getInfoAsync(IMAGE_DIR);
    if (!dir.exists) await makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
    const target = `${IMAGE_DIR}${newId()}.jpg`;
    await copyAsync({ from: uri, to: target });
    return target;
  } catch {
    return undefined;
  }
};

export default function TicketScanner() {
  const [image, setImage] = useState<string | null>(null);
  const [analyzed, setAnalyzed] = useState<ExtractedTicketData | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const addTicket = useStore((s) => s.addTicket);
  const resolveSupermarketName = useStore((s) => s.resolveSupermarketName);

  useEffect(() => () => abortRef.current?.abort(), []);

  const clearSelection = useCallback(() => {
    abortRef.current?.abort();
    setImage(null);
    setAnalyzed(null);
    setLoading(false);
  }, []);

  const select = useCallback((uri: string) => {
    setImage(uri);
    setAnalyzed(null);
  }, []);

  const takePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "We need camera permissions to scan tickets.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
      if (!result.canceled && result.assets?.[0]) select(result.assets[0].uri);
    } catch {
      Alert.alert("Error", "Failed to take photo");
    }
  }, [select]);

  const pickImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "We need access to your gallery.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.9,
      });
      if (!result.canceled && result.assets?.[0]) select(result.assets[0].uri);
    } catch {
      Alert.alert("Error", "Failed to pick image");
    }
  }, [select]);

  const processImage = useCallback(async () => {
    if (!image || loading) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    try {
      // Keep aspect ratio; 1280 px wide stays legible for long receipts.
      const manipulated = await ImageManipulator.manipulateAsync(
        image,
        [{ resize: { width: 1280 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      const base64 = await readAsStringAsync(manipulated.uri, {
        encoding: EncodingType.Base64,
      });
      const result = await analyzeReceipt(`data:image/jpeg;base64,${base64}`, {
        signal: controller.signal,
      });
      if (!controller.signal.aborted) setAnalyzed(result);
    } catch (e) {
      if (e instanceof ReceiptAnalysisError) {
        if (e.code !== "cancelled") Alert.alert("Analysis failed", e.message);
      } else {
        Alert.alert("Error", "Something went wrong while preparing the photo.");
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setLoading(false);
    }
  }, [image, loading]);

  const cancelAnalysis = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  const handleSave = useCallback(
    async (ticket: Omit<Ticket, "id" | "imageUri">, detectedName: string) => {
      const imageUri = image ? await persistImage(image) : undefined;
      const added = addTicket({ ...ticket, id: newId(), imageUri }, detectedName);
      clearSelection();
      if (added) {
        Alert.alert("Saved", `Added ticket from ${ticket.supermarket}`);
      } else {
        Alert.alert(
          "Duplicate ticket",
          "This ticket looks like one you already scanned, so it was not added again."
        );
      }
    },
    [addTicket, clearSelection, image]
  );

  return (
    <View className="p-6">
      <View className="p-6 mb-6 items-center">
        {image ? (
          <View className="w-full rounded-xl mb-4 bg-emerald-50 border border-emerald-100 p-5">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-emerald-800 font-bold text-base">
                  Ticket selected
                </Text>
                <Text className="text-emerald-700 text-sm mt-1">
                  {analyzed
                    ? "Review the details and save the ticket."
                    : "Your photo is ready to analyze."}
                </Text>
              </View>
              <View className="bg-emerald-100 p-3 rounded-full">
                <FontAwesome
                  name={analyzed ? "pencil" : "check"}
                  size={18}
                  color="#047857"
                />
              </View>
            </View>
            <Pressable
              onPress={clearSelection}
              accessibilityRole="button"
              accessibilityLabel="Remove selected ticket photo"
              className="self-start mt-4 bg-white px-3 py-2 rounded-lg border border-emerald-200"
            >
              <Text className="text-emerald-700 font-semibold">Remove</Text>
            </Pressable>
          </View>
        ) : (
          <View className="w-full h-48 rounded-xl border-2 border-dashed border-slate-300 items-center justify-center bg-slate-50 mb-4">
            <FontAwesome name="ticket" size={48} color="#94a3b8" />
            <Text className="text-slate-400 mt-2 font-medium">
              No ticket selected
            </Text>
          </View>
        )}

        <View className="flex-row gap-3 w-full">
          <Pressable
            onPress={takePhoto}
            accessibilityRole="button"
            accessibilityLabel="Take a photo of a ticket"
            className="flex-1 bg-white border border-slate-200 p-4 rounded-xl flex-row items-center justify-center"
          >
            <FontAwesome name="camera" size={18} color="#475569" />
            <Text className="text-slate-600 font-semibold ml-2">Camera</Text>
          </Pressable>

          <Pressable
            onPress={pickImage}
            accessibilityRole="button"
            accessibilityLabel="Choose a ticket photo from the gallery"
            className="flex-1 bg-white border border-slate-200 p-4 rounded-xl flex-row items-center justify-center"
          >
            <FontAwesome name="image" size={18} color="#475569" />
            <Text className="text-slate-600 font-semibold ml-2">Gallery</Text>
          </Pressable>
        </View>
      </View>

      {image && !analyzed && (
        <View>
          <Pressable
            className={`btn-primary ${loading ? "opacity-70" : ""}`}
            onPress={processImage}
            disabled={loading}
            accessibilityRole="button"
            accessibilityState={{ disabled: loading, busy: loading }}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <FontAwesome name="magic" size={18} color="white" />
            )}
            <Text className="btn-text ml-2">
              {loading ? "Analyzing..." : "Analyze Ticket"}
            </Text>
          </Pressable>
          {loading && (
            <Pressable
              onPress={cancelAnalysis}
              accessibilityRole="button"
              className="self-center mt-3 px-4 py-2"
            >
              <Text className="text-slate-500 font-semibold">Cancel</Text>
            </Pressable>
          )}
        </View>
      )}

      {analyzed && (
        <TicketReview
          data={analyzed}
          initialSupermarket={resolveSupermarketName(analyzed.supermarket)}
          onSave={handleSave}
          onCancel={clearSelection}
        />
      )}
    </View>
  );
}
