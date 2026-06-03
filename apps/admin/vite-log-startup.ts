import type { Plugin } from "vite"

/** Vite dev 启动后打印，与 server 控制台说明对照 */
export function devStartupLogPlugin(): Plugin {
  return {
    name: "dev-startup-log",
    configureServer(server) {
      server.httpServer?.once("listening", () => {
        const addr = server.httpServer?.address()
        const port =
          typeof addr === "object" && addr && "port" in addr ? addr.port : 5173
        const localUrl = `http://localhost:${port}/app/`
        const apiPort = process.env.SERVER_PORT || "7000"

        console.log("")
        console.log(`   Admin dev (Vite): ${localUrl}`)
        console.log(`             └─ 日常改界面用这里（HMR）`)
        console.log(
          `   API proxy:      /api → http://localhost:${apiPort}/api`
        )
        console.log(
          `   备注: 若已 build:admin，http://localhost:${apiPort}/app/ 也能访问，但是 server 上的静态包，不会随保存自动更新`
        )
        console.log("")
      })
    },
  }
}
