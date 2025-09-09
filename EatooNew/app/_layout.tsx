import "./global.css";
import { Drawer } from "expo-router/drawer";

export default function RootLayout() {
  return (
    <Drawer initialRouteName="(tabs)">
      {/* Hide the root index from the drawer */}
      <Drawer.Screen name="index" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="(tabs)" options={{ title: "Home", headerShown: false }} />
      <Drawer.Screen name="businessprof" options={{ title: "Business Profile" }} />
      <Drawer.Screen name="passsec" options={{ title: "Password & Security" }} />
      <Drawer.Screen name="prefquestion" options={{ title: "Preference Questions" }} />
      <Drawer.Screen name="privacy" options={{ title: "Privacy" }} />
    </Drawer>
  );
}
