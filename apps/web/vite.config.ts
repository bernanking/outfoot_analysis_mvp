import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

// 웹은 정적 SPA로만 빌드합니다. Cloudflare는 wrangler.jsonc의 정적 자산(Workers Static Assets)으로 제공하고,
// 업무 API는 Supabase Edge Functions가 처리합니다(docs/08_ARCHITECTURE.md). 여기에 서버 처리 경로를 두지 않습니다.
export default defineConfig({
  plugins: [vue()],
  // dist 바로 아래에는 사용자가 둔 검토용 HTML이 있을 수 있어 빌드 결과는 dist/client만 비우고 씁니다.
  build: { outDir: "dist/client", emptyOutDir: true },
});
