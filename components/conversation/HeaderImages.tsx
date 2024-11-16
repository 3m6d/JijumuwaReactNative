import { View } from "@/components/Themed";
import { Image } from "expo-image";
import { blurhash } from "@/constants";

export const HeaderImages = () => {
  return (
    <View className="flex flex-row justify-center w-full bg-transparent">
      <Image
        placeholder={blurhash}
        source={require("@/assets/images/bye-en.svg")}
        className="h-16 mt-10 w-16 z-10"
      />
      <Image
        placeholder={blurhash}
        source={require("@/assets/images/header.svg")}
        className="h-32 w-32 z-10"
      />
      <Image
        placeholder={blurhash}
        source={require("@/assets/images/bye-np.svg")}
        className="h-16 w-16 mt-10 z-10"
      />
    </View>
  );
};
