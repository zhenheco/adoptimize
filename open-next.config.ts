import type { OpenNextConfig } from "@opennextjs/cloudflare";

const config: OpenNextConfig = {
  default: {
    override: {
      wrapper: "cloudflare-node",
      converter: "edge",
      proxyExternalRequest: "fetch",
      incrementalCache: "dummy",
      tagCache: "dummy",
      queue: "dummy",
    },
  },

  // 處理 Node.js crypto 模組
  edgeExternals: ["node:crypto"],

  // 不使用外部 middleware（專案沒有自訂 middleware）
  middleware: {
    external: false,
  },
};

export default config;
