import { Badge, Button, Table, Text } from "@medusajs/ui"
import { Link } from "react-router-dom"
import { PageContainer, PageHeader } from "@/components/layout/shell"
import { useProducts } from "@/hooks/use-products"

const statusLabel: Record<string, string> = {
  draft: "草稿",
  proposed: "待审",
  published: "已发布",
  rejected: "已拒绝",
}

export function ProductListPage() {
  const { data, isLoading, error } = useProducts({ limit: 50 })

  return (
    <PageContainer>
      <PageHeader
        title="商品"
        subtitle={`共 ${data?.count ?? 0} 件商品`}
        actions={
          <Button asChild>
            <Link to="/products/new">新建商品</Link>
          </Button>
        }
      />

      {isLoading && <Text>加载中...</Text>}
      {error && <Text className="text-ui-fg-error">加载失败</Text>}

      {data && (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>标题</Table.HeaderCell>
              <Table.HeaderCell>Handle</Table.HeaderCell>
              <Table.HeaderCell>状态</Table.HeaderCell>
              <Table.HeaderCell></Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {data.products.map((p) => (
              <Table.Row key={p.id}>
                <Table.Cell>{p.title}</Table.Cell>
                <Table.Cell>
                  <Text className="text-ui-fg-subtle font-mono text-xs">
                    {p.handle}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Badge size="small">
                    {statusLabel[p.status ?? "draft"] ?? p.status}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Button variant="transparent" size="small" asChild>
                    <Link to={`/products/${p.id}`}>查看</Link>
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
