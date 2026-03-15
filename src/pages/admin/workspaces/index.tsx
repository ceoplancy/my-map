import AdminLayout from "@/layouts/AdminLayout"
import {
  useAdminWorkspaces,
  useCreateAdminWorkspace,
  type AdminWorkspaceItem,
} from "@/api/supabase"
import { useAdminStatus } from "@/api/auth"
import { useCurrentWorkspace } from "@/store/workspaceState"
import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import { useState } from "react"
import type { AccountType } from "@/types/db"
import { toast } from "react-toastify"
import Link from "next/link"
import GlobalSpinner from "@/components/ui/global-spinner"

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem;
  background: linear-gradient(135deg, white, #f8fafc);
  border-radius: 1rem;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
`

const Title = styled.h1`
  font-size: 1.75rem;
  font-weight: 800;
  background: linear-gradient(135deg, #1f2937, #4b5563);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`

const AddButton = styled.button`
  background: linear-gradient(135deg, ${COLORS.blue[500]}, ${COLORS.blue[600]});
  color: ${COLORS.background.white};
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);

  &:hover {
    transform: translateY(-2px);
    box-shadow:
      0 10px 15px -3px rgba(0, 0, 0, 0.1),
      0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`

const TableWrapper = styled.div`
  overflow-x: auto;
  background: white;
  border-radius: 1rem;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`

const Th = styled.th`
  padding: 1rem 1.5rem;
  text-align: left;
  font-weight: 600;
  color: ${COLORS.gray[700]};
  border-bottom: 1px solid ${COLORS.gray[200]};
`

const Td = styled.td`
  padding: 1rem 1.5rem;
  border-bottom: 1px solid ${COLORS.gray[100]};
  font-size: 0.875rem;
  color: ${COLORS.gray[700]};
`

const EmptyMessage = styled.div`
  padding: 3rem;
  text-align: center;
  color: ${COLORS.gray[600]};
`

const ForbiddenMessage = styled.div`
  padding: 3rem;
  text-align: center;
  color: ${COLORS.gray[600]};
  a {
    color: ${COLORS.blue[600]};
    font-weight: 600;
  }
`

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
`

const ModalBox = styled.div`
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  min-width: 20rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
`

const ModalTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: ${COLORS.gray[900]};
`

const FormGroup = styled.div`
  margin-bottom: 1rem;
`

const Label = styled.label`
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: ${COLORS.gray[700]};
  margin-bottom: 0.375rem;
`

const Input = styled.input`
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid ${COLORS.gray[300]};
  border-radius: 0.5rem;
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: ${COLORS.blue[500]};
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }
`

const Select = styled.select`
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid ${COLORS.gray[300]};
  border-radius: 0.5rem;
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: ${COLORS.blue[500]};
  }
`

const ModalActions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
`

const SecondaryButton = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 500;
  border: 1px solid ${COLORS.gray[300]};
  background: white;
  color: ${COLORS.gray[700]};
  cursor: pointer;

  &:hover {
    background: ${COLORS.gray[50]};
  }
`

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  listed_company: "상장사",
  proxy_company: "의결권 대행사",
}

export default function AdminWorkspacesPage() {
  const { data: adminStatus, isLoading: adminStatusLoading } = useAdminStatus()
  const { data: workspaces = [], isLoading } = useAdminWorkspaces()
  const createWorkspace = useCreateAdminWorkspace()
  const [, setCurrentWorkspace] = useCurrentWorkspace()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [name, setName] = useState("")
  const [accountType, setAccountType] = useState<AccountType>("listed_company")

  const isServiceAdmin = adminStatus?.isServiceAdmin ?? false
  if (!adminStatusLoading && !isServiceAdmin) {
    return (
      <AdminLayout>
        <Container>
          <ForbiddenMessage>
            워크스페이스 관리는 통합 관리자만 이용할 수 있습니다.{" "}
            <Link href="/admin/integrated">대시보드로 이동</Link>
          </ForbiddenMessage>
        </Container>
      </AdminLayout>
    )
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("워크스페이스 이름을 입력해 주세요.")

      return
    }
    createWorkspace.mutate(
      { name: name.trim(), account_type: accountType },
      {
        onSuccess: (created: AdminWorkspaceItem) => {
          setIsModalOpen(false)
          setName("")
          setAccountType("listed_company")
          setCurrentWorkspace(created)
        },
      },
    )
  }

  return (
    <AdminLayout>
      <Container>
        <Header>
          <Title>워크스페이스 관리</Title>
          <AddButton onClick={() => setIsModalOpen(true)}>
            워크스페이스 만들기
          </AddButton>
        </Header>

        <TableWrapper>
          {isLoading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "2rem",
              }}>
              <GlobalSpinner width={24} height={24} dotColor="#8536FF" />
            </div>
          ) : workspaces.length === 0 ? (
            <EmptyMessage>
              워크스페이스가 없습니다. &quot;워크스페이스 만들기&quot;로 새
              워크스페이스를 추가하세요.
            </EmptyMessage>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>이름</Th>
                  <Th>계정 유형</Th>
                  <Th>생성일</Th>
                </tr>
              </thead>
              <tbody>
                {workspaces.map((ws) => (
                  <tr key={ws.id}>
                    <Td>{ws.name}</Td>
                    <Td>
                      {ACCOUNT_TYPE_LABELS[ws.account_type] ?? ws.account_type}
                    </Td>
                    <Td>
                      {ws.created_at
                        ? new Date(ws.created_at).toLocaleDateString("ko-KR")
                        : "-"}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </TableWrapper>

        {isModalOpen && (
          <ModalOverlay
            onClick={() => !createWorkspace.isPending && setIsModalOpen(false)}>
            <ModalBox onClick={(e) => e.stopPropagation()}>
              <ModalTitle>워크스페이스 만들기</ModalTitle>
              <form onSubmit={handleCreate}>
                <FormGroup>
                  <Label htmlFor="ws-name">이름</Label>
                  <Input
                    id="ws-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="워크스페이스 이름"
                    autoFocus
                  />
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="ws-account-type">계정 유형</Label>
                  <Select
                    id="ws-account-type"
                    value={accountType}
                    onChange={(e) =>
                      setAccountType(e.target.value as AccountType)
                    }>
                    <option value="listed_company">상장사</option>
                    <option value="proxy_company">의결권 대행사</option>
                  </Select>
                </FormGroup>
                <ModalActions>
                  <SecondaryButton
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={createWorkspace.isPending}>
                    취소
                  </SecondaryButton>
                  <AddButton
                    type="submit"
                    disabled={createWorkspace.isPending || !name.trim()}>
                    {createWorkspace.isPending ? "생성 중..." : "생성"}
                  </AddButton>
                </ModalActions>
              </form>
            </ModalBox>
          </ModalOverlay>
        )}
      </Container>
    </AdminLayout>
  )
}
