import { Text, View } from "@/components/Themed";

export const WelcomeText = () => {
  return (
    <View className="flex-1 items-center justify-center bg-transparent w-full">
      <Text className="text-2xl text-black">नमस्ते</Text>
      <Text className="text-xl text-black">म तपाईंको डिजिटल साथी हुँ।</Text>
    </View>
  );
};
