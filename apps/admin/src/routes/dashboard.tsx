import { Heading, Text } from "@medusajs/ui"
import { PageContainer, PageHeader } from "@/components/layout/shell"
import { useSession } from "@/hooks/use-auth"

export function DashboardPage() {
  const { data } = useSession()

  return (
    <PageContainer>
      <PageHeader title="概览" subtitle="欢迎使用自定义管理后台" />
      <div className="rounded-lg border border-ui-border-base bg-ui-bg-base p-6">
        <Heading level="h2" className="mb-2">
          你好，{data?.user.first_name || data?.user.email}
        </Heading>
        <Text className="text-ui-fg-subtle">
          基于 Hono RPC + Drizzle 构建，复用 Medusa 数据库与 UI 组件。
        </Text>
      </div>
    </PageContainer>
  )
}
