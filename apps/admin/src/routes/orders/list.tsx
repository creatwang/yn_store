import { Badge, Button, Table, Text } from "@medusajs/ui"
import { Link } from "react-router-dom"
import { PageContainer, PageHeader } from "@/components/layout/shell"
import { useOrders } from "@/hooks/use-orders"

const statusLabel: Record<string, string> = {
  pending: "待处理",
  completed: "已完成",
  canceled: "已取消",
  archived: "已归档",
}

export function OrderListPage() {
  const { data, isLoading, error } = useOrders()

  return (
    <PageContainer>
      <PageHeader
        title="订单"
        subtitle={`共 ${data?.count ?? 0} 个订单`}
      />

      {isLoading && <Text>加载中...</Text>}
      {error && (
        <Text className="text-ui-fg-error">
          {error instanceof Error ? error.message : "加载失败"}
        </Text>
      )}

      {data && (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>订单号</Table.HeaderCell>
              <Table.HeaderCell>客户</Table.HeaderCell>
              <Table.HeaderCell>状态</Table.HeaderCell>
              <Table.HeaderCell>创建时间</Table.HeaderCell>
              <Table.HeaderCell></Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {data.orders.map((o) => (
              <Table.Row key={o.id}>
                <Table.Cell>#{o.display_id}</Table.Cell>
                <Table.Cell>{o.email}</Table.Cell>
                <Table.Cell>
                  <Badge size="small">
                    {statusLabel[o.status ?? "pending"] ?? o.status}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Text className="text-ui-fg-subtle text-sm">
                    {o.created_at
                      ? new Date(o.created_at).toLocaleDateString()
                      : "—"}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Button variant="transparent" size="small" asChild>
                    <Link to={`/orders/${o.id}`}>查看</Link>
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </PageContainer>
  )
}