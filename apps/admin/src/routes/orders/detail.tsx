import { Badge, Button, Container, Heading, Text } from "@medusajs/ui"
import { useEffect } from "react"
import { Link, useParams } from "react-router-dom"
import { PageContainer, PageHeader } from "@/components/layout/shell"
import { useOrder, useCancelOrder } from "@/hooks/use-orders"
import { toast } from "@medusajs/ui"

const statusLabel: Record<string, string> = {
  pending: "待处理",
  completed: "已完成",
  canceled: "已取消",
  archived: "已归档",
}

export function OrderDetailPage() {
  const { id = "" } = useParams()
  const { data, isLoading } = useOrder(id)
  const cancelOrder = useCancelOrder(id)

  const handleCancel = async () => {
    try {
      await cancelOrder.mutateAsync()
      toast.success("订单已取消")
    } catch {
      toast.error("取消失败")
    }
  }

  if (isLoading) return <Text>加载中...</Text>
  if (!data?.order) return <Text>订单不存在</Text>

  const o = data.order

  return (
    <PageContainer>
      <PageHeader
        title={`订单 #${o.display_id}`}
        subtitle={o.id}
        actions={
          <div className="flex gap-2">
            {o.status !== "canceled" && (
              <Button
                variant="secondary"
                isLoading={cancelOrder.isPending}
                onClick={handleCancel}
              >
                取消订单
              </Button>
            )}
            <Button variant="secondary" asChild>
              <Link to="/orders">返回列表</Link>
            </Button>
          </div>
        }
      />
      <Container className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <Badge>{statusLabel[o.status ?? "pending"] ?? o.status}</Badge>
            <Text className="text-ui-fg-subtle mt-2">
              创建于 {new Date(o.created_at).toLocaleString()}
            </Text>
          </div>
        </div>
      </Container>
      <Container>
        <Heading level="h2" className="mb-4">订单信息</Heading>
        <div className="space-y-2">
          <Text>邮箱: {o.email}</Text>
          <Text>货币: {o.currency_code}</Text>
          {o.region_id && <Text>区域: {o.region_id}</Text>}
          {o.sales_channel_id && <Text>销售渠道: {o.sales_channel_id}</Text>}
        </div>
      </Container>
    </PageContainer>
  )
}