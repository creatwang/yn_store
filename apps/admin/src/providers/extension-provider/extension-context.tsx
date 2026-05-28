import { createContext } from "react"

export interface ExtensionApi {
  getWidgets: (zone: string) => React.ComponentType[]
  getMenu: () => any
  getI18nResources: () => any
}

export const ExtensionContext = createContext<ExtensionApi | null>(null)
