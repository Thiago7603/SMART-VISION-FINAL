import { View } from "react-native";
import Landing from "./Landing";

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Landing />
    </View>
  );
}
