import { Container, Heading, Text } from "@medusajs/ui"
import { Link, Outlet, useLocation } from "react-router-dom"
import { useLogout } from "@/hooks/use-auth"

const navItems = [
  { label: "概览", path: "/" },
  { label: "商品", path: "/products" },
  { label: "订单", path: "/orders" },
  { label: "客户", path: "/customers" },
]

export function Shell() {
  const location = useLocation()
  const logout = useLogout()

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r border-ui-border-base bg-ui-bg-base p-4">
        <Heading level="h2" className="mb-6">
          管理后台
        </Heading>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active =
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`rounded-md px-3 py-2 text-sm ${
                  active
                    ? "bg-ui-bg-highlight text-ui-fg-base"
                    : "text-ui-fg-subtle hover:bg-ui-bg-base-hover"
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
        <button
          type="button"
          onClick={logout}
          className="mt-8 text-sm text-ui-fg-muted hover:text-ui-fg-base"
        >
          退出登录
        </button>
      </aside>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex items-start justify-between">
      <div>
        <Heading level="h1">{title}</Heading>
        {subtitle && (
          <Text className="text-ui-fg-subtle mt-1">{subtitle}</Text>
        )}
      </div>
      {actions}
    </div>
  )
}

export function PageContainer({ children }: { children: React.ReactNode }) {
  return <Container className="p-0">{children}</Container>
}
