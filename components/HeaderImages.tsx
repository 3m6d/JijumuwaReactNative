import { View } from "@/components/Themed";
import { Image } from "expo-image";
import { blurhash } from "@/constants";

export const HeaderImages = () => {
  return (
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
        source={require("@/assets/images/hello-sarathi.svg")}
        className="h-32 w-32 mt-4 z-10"
      />
    </View>
  );
};
