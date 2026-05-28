declare module "virtual:medusa/forms" {
  import type { FormModule } from "./dashboard-app/types"
  const formModule: FormModule
  export default formModule
}

declare module "virtual:medusa/links" {
  import type { LinkModule } from "./dashboard-app/types"
  const linkModule: LinkModule
  export default linkModule
}

declare module "virtual:medusa/displays" {
  import type { DisplayModule } from "./dashboard-app/types"
  const displayModule: DisplayModule
  export default displayModule
}

declare module "virtual:medusa/routes" {
  import type { RouteModule } from "./dashboard-app/types"
  const routeModule: RouteModule
  export default routeModule
}

declare module "virtual:medusa/menu-items" {
  import type { MenuItemModule } from "./dashboard-app/types"
  const menuItemModule: MenuItemModule
  export default menuItemModule
}

declare module "virtual:medusa/widgets" {
  import type { WidgetModule } from "./dashboard-app/types"
  const widgetModule: WidgetModule
  export default widgetModule
}

declare module "virtual:medusa/i18n" {
  import type { I18nModule } from "./dashboard-app/types"
  const i18nModule: I18nModule
  export default i18nModule
}
