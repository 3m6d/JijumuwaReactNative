import { StyleSheet, TouchableOpacity } from "react-native";

import { Text, View } from "@/components/Themed";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { blurhash } from "@/constants/blurHash";

export default function TabOneScreen() {
  return (
    <View className="flex-1 items-center justify-between p-4">
      <LinearGradient
        // Background Linear Gradient
        colors={["rgba(255,255,255,255)", "#fff", "#ffffd0"]}
        className="absolute flex-1 top-0 left-0 right-0 bottom-0 z-0"
      />
      <View className="flex flex-row justify-between w-full bg-transparent">
        <Image
          placeholder={blurhash}
          source={require("@/assets/images/namaste-sarathi.svg")}
          className="h-32 mt-4 w-32 z-10"
        />
        <Image
          placeholder={blurhash}
          source={require("@/assets/images/namaskar-sarathi.svg")}
          className="h-32 mt-10 w-32 z-10"
        />
        <Image
          placeholder={blurhash}
          source={require("@/assets/images/header.svg")}
          className="h-48 w-48 z-10"
        />
        <Image
          placeholder={blurhash}
          source={require("@/assets/images/hi-sarathi.svg")}
          className="h-32 w-32 mt-10 z-10"
        />
        <Image
          placeholder={blurhash}
          source={require("@/assets/images/hello-sarathi.svg")}
          className="h-32 w-32 mt-4 z-10"
        />
      </View>

      <View className="flex-1 items-center justify-center bg-transparent w-full">
        <Text className="text-xl text-black mb-4">
          Press the button below to start
        </Text>
        <View className="relative flex flex-row items-center justify-center w-full bg-transparent">
          <TouchableOpacity className="bg-yellow-400 py-2 px-10 rounded-full z-10">
            <Text className="text-4xl text-center font-extrabold text-gray-800">
              Start Talking
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
