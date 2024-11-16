import { Text, View } from "@/components/Themed";

export const WelcomeText = () => {
  return (
    <View className="flex-1 items-center justify-center bg-transparent w-full">
      <Text className="text-2xl text-black">नमस्ते</Text>
      <Text className="text-xl text-black">किन आउँनु भो ? हजुर!</Text>
      <Text className="text-xl text-black font-bold mb-2">
        जिज्ञासा राख्न तल थिच्नुहोस्
      </Text>
    </View>
  );
};
