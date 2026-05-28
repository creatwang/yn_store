import { PropsWithChildren } from "react"
import { ExtensionContext } from "./extension-context"
import translations from "../../i18n/translations"

const api = {
  getWidgets: () => [],
  getMenu: () => [],
  getI18nResources: () => translations,
  getFormFields: () => [],
  getFormConfigs: () => [],
  getDisplays: () => [],
}

export const ExtensionProvider = ({ children }: PropsWithChildren) => {
  return (
    <ExtensionContext.Provider value={api}>
      {children}
    </ExtensionContext.Provider>
  )
}
