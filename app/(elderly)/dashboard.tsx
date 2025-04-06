import { View } from "@/components/Themed";
import { HeaderImages } from "@/components/HeaderImages";
import { WelcomeText } from "@/components/WelcomeText";
import { ActionButton } from "@/components/ActionButton";
import { BackgroundGradient } from "@/components/BackgroundGradient";
import { router } from "expo-router";

export default function elderlyDashboard() {
  return (
    <View className="flex-1 items-center justify-center p-4">
      <BackgroundGradient />
      <HeaderImages />
      <WelcomeText />

      <View className="flex-1 flex-row gap-4 bg-transparent justify-centre items-center p-2">
        <ActionButton text="आउनुस्, कुरा गरौँ ।"
        onPress={() => router.replace("/two")} />

        <ActionButton
          text="🎶गीत सुनाऊ🎶"
          onPress={() => router.replace("/three")}
        />
      </View>
    </View>
  );
}
