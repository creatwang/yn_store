import { Button, Table, Text } from "@medusajs/ui"
import { Link } from "react-router-dom"
import { PageContainer, PageHeader } from "@/components/layout/shell"
import { useCustomers } from "@/hooks/use-customers"

export function CustomerListPage() {
  const { data, isLoading, error } = useCustomers({ limit: 50 })

  return (
    <PageContainer>
      <PageHeader
        title="客户"
        subtitle={`共 ${data?.count ?? 0} 位客户`}
      />

      {isLoading && <Text>加载中...</Text>}
      {error && <Text className="text-ui-fg-error">加载失败</Text>}

      {data && (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>姓名</Table.HeaderCell>
              <Table.HeaderCell>邮箱</Table.HeaderCell>
              <Table.HeaderCell>创建时间</Table.HeaderCell>
              <Table.HeaderCell></Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {data.customers.map((c) => (
              <Table.Row key={c.id}>
                <Table.Cell>
                  {c.first_name} {c.last_name}
                </Table.Cell>
                <Table.Cell>{c.email}</Table.Cell>
                <Table.Cell>
                  <Text className="text-ui-fg-subtle text-sm">
                    {new Date(c.created_at).toLocaleDateString()}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Button variant="transparent" size="small" asChild>
                    <Link to={`/customers/${c.id}`}>查看</Link>
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