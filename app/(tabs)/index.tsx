import { View } from "@/components/Themed";
import { HeaderImages } from "@/components/HeaderImages";
import { WelcomeText } from "@/components/WelcomeText";
import { ActionButton } from "@/components/ActionButton";
import { BackgroundGradient } from "@/components/BackgroundGradient";
import { router } from "expo-router";

export default function TabOneScreen() {
  return (
    <View className="flex-1 items-center justify-between p-4">
      <BackgroundGradient />
      <HeaderImages />
      <WelcomeText />
      <View className="flex-1 flex-row gap-4 bg-transparent justify-between items-center p-2">
        <ActionButton text="अगाडी बढ्नुहोस्" />
        <ActionButton
          text="खेल खेल्नुहोस्"
          onPress={() => router.replace("/(tabs)/game")}
        />
      </View>
    </View>
  );
}
