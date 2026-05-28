/**
 * Stub replacement for Medusa Dashboard's plugin-based dashboard-app module.
 * We use hardcoded routes instead of the plugin system.
 */

export { getLinkedFields } from "./links/utils"
export { useExtendableForm } from "./forms/hooks"
export { FormExtensionZone } from "./forms/form-extension-zone"
export type { DashboardPlugin } from "./types"
export type { I18nNamespace, I18nTranslationValue } from "./types"
