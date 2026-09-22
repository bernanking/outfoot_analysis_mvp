import { createPinia } from "pinia";
import { createApp } from "vue";
import PrimeVue from "primevue/config";

import App from "./App.vue";
import { outfootTheme } from "./app/primevue";
import { router } from "./router";
import "./styles/global.css";

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(PrimeVue, {
  theme: {
    preset: outfootTheme,
    options: {
      darkModeSelector: ".outfoot-dark",
    },
  },
});

app.mount("#app");
