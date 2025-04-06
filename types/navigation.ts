import { FontAwesome } from "@expo/vector-icons";

export type TabScreenConfig = {
  name: string;
  title: string;
  icon: keyof typeof FontAwesome.glyphMap;
  headerShown?: boolean;
  hideTabBar?: boolean;
};

export type TabRoutesConfig = {
  index: TabScreenConfig;
  register: TabScreenConfig;
  login: TabScreenConfig;
};

export type ElderlyRoutesConfig = {
  two: TabScreenConfig;
};


