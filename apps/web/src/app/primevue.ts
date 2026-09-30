import { definePreset } from "@primeuix/themes";
import Aura from "@primeuix/themes/aura";

export const outfootTheme = definePreset(Aura, {
  semantic: {
    primary: {
      50: "#edf3f7",
      100: "#d7e3ec",
      200: "#afc7d9",
      300: "#84abc5",
      400: "#5a86a5",
      500: "#315f80",
      600: "#234b6b",
      700: "#17324d",
      800: "#142b42",
      900: "#102338",
      950: "#0a1928"
    },
    // 업무 화면 버튼(.primary-button)과 같은 주색·hover를 쓰도록 맞춥니다.
    colorScheme: {
      light: {
        primary: {
          color: "{primary.700}",
          contrastColor: "#ffffff",
          hoverColor: "{primary.600}",
          activeColor: "{primary.800}"
        }
      }
    }
  }
});
