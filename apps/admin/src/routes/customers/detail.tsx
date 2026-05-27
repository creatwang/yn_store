import { Button, Container, Heading, Text } from "@medusajs/ui"
import { Link, useParams } from "react-router-dom"
import { PageContainer, PageHeader } from "@/components/layout/shell"
import { useCustomer } from "@/hooks/use-customers"

export function CustomerDetailPage() {
  const { id = "" } = useParams()
  const { data, isLoading } = useCustomer(id)

  if (isLoading) return <Text>加载中...</Text>
  if (!data?.customer) return <Text>客户不存在</Text>

  const c = data.customer

  return (
    <PageContainer>
      <PageHeader
        title={`${c.first_name} ${c.last_name}`}
        subtitle={c.id}
        actions={
          <Button variant="secondary" asChild>
            <Link to="/customers">返回列表</Link>
          </Button>
        }
      />
      <Container className="mb-4">
        <Text className="text-ui-fg-subtle">
          创建于 {new Date(c.created_at).toLocaleString()}
        </Text>
      </Container>
      <Container>
        <Heading level="h2" className="mb-4">客户信息</Heading>
        <div className="space-y-2">
          <Text>邮箱: {c.email}</Text>
          <Text>姓名: {c.first_name} {c.last_name}</Text>
          <Text>电话: {c.phone ?? "-"}</Text>
          {c.company_name && <Text>公司: {c.company_name}</Text>}
        </div>
      </Container>
    </PageContainer>
  )
}