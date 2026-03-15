import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import Head from "next/head"
import styled from "@emotion/styled"
import { FullPageLoader } from "@/components/FullPageLoader"
import { useAdminStatus, useGetUserData, useMyWorkspaces } from "@/api/auth"
import {
  useCreateAdminWorkspace,
  type AdminWorkspaceItem,
} from "@/api/supabase"
import { useCurrentWorkspace } from "@/store/workspaceState"
import type { AccountType, MyWorkspaceItem } from "@/types/db"
import { COLORS } from "@/styles/global-style"
import { toast } from "react-toastify"
import Select from "@/components/ui/select"

const Page = styled.div`
  min-height: 100vh;
  background: ${COLORS.background.light};
  padding: 2rem;
`

const Container = styled.div`
  max-width: 40rem;
  margin: 0 auto;
`

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.5rem;
`

const Title = styled.h1`
  font-size: 1.75rem;
  font-weight: 800;
  color: ${COLORS.gray[900]};
  margin: 0;
`

const IntegratedAdminLink = styled(Link)`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${COLORS.purple[600]};
  text-decoration: none;
  white-space: nowrap;
  &:hover {
    text-decoration: underline;
    color: ${COLORS.purple[700]};
  }
`

const Subtitle = styled.p`
  color: ${COLORS.gray[600]};
  font-size: 0.875rem;
  margin-bottom: 2rem;
`

const Card = styled.div`
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  margin-bottom: 1rem;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
`

const CardName = styled.div`
  font-weight: 600;
  color: ${COLORS.gray[900]};
`

const CardMeta = styled.div`
  font-size: 0.8125rem;
  color: ${COLORS.gray[500]};
`

const ButtonRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
`

const UseButton = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
  border: none;
  cursor: pointer;
  background: linear-gradient(135deg, ${COLORS.blue[500]}, ${COLORS.blue[600]});
  color: white;
  white-space: nowrap;

  &:hover {
    opacity: 0.95;
  }
`

const AdminButton = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
  border: 1px solid ${COLORS.purple[500]};
  background: white;
  color: ${COLORS.purple[700]};
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: ${COLORS.purple[50]};
  }
`

const CreateButton = styled.button`
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  font-weight: 600;
  border: 1px dashed ${COLORS.gray[300]};
  background: white;
  color: ${COLORS.gray[700]};
  cursor: pointer;
  width: 100%;
  max-width: 40rem;

  &:hover {
    background: ${COLORS.gray[50]};
    border-color: ${COLORS.gray[400]};
  }
`

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1.5rem;
  background: white;
  border-radius: 1rem;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
`

const EmptyTitle = styled.h2`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${COLORS.gray[800]};
  margin-bottom: 0.5rem;
`

const EmptyText = styled.p`
  font-size: 0.875rem;
  color: ${COLORS.gray[600]};
  margin-bottom: 1.5rem;
`

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  listed_company: "상장사",
  proxy_company: "의결권 대행사",
}

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
  }
`

const ModalSelect = styled(Select)`
  width: 100%;
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

export default function WorkspacesPage() {
  const router = useRouter()
  const { data: user, isLoading: userLoading } = useGetUserData()
  const hasUser = Boolean(user?.user)
  const { data: workspaces = [], isLoading: workspacesLoading } =
    useMyWorkspaces({ enabled: !userLoading && hasUser })
  const [, setCurrentWorkspace] = useCurrentWorkspace()
  const createWorkspace = useCreateAdminWorkspace()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [name, setName] = useState("")
  const [accountType, setAccountType] = useState<AccountType>("listed_company")

  const { data: adminStatus } = useAdminStatus()
  const isServiceAdmin = adminStatus?.isServiceAdmin ?? false
  const isAdmin =
    isServiceAdmin || String(user?.user?.user_metadata?.role).includes("admin")

  useEffect(() => {
    if (userLoading) return
    if (!user?.user) {
      router.replace("/sign-in")
    }
  }, [user?.user, userLoading, router])

  const handleUseWorkspace = (ws: MyWorkspaceItem, target: "map" | "admin") => {
    setCurrentWorkspace(ws)
    if (target === "map") {
      router.push(`/workspaces/${ws.id}`)
    } else {
      router.push(`/workspaces/${ws.id}/admin`)
    }
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

  if (userLoading || !user?.user) {
    return (
      <Page>
        <Container>
          <div style={{ textAlign: "center", padding: "3rem" }}>
            로그인 확인 중...
          </div>
        </Container>
      </Page>
    )
  }

  if (workspacesLoading) {
    return (
      <>
        <Head>
          <title>워크스페이스 선택 | ANT:RE</title>
        </Head>
        <FullPageLoader message="워크스페이스 목록을 불러오는 중..." />
      </>
    )
  }

  return (
    <>
      <Head>
        <title>워크스페이스 선택 | ANT:RE</title>
      </Head>
      <Page>
        <Container>
          <TitleRow>
            <Title>워크스페이스</Title>
            {isServiceAdmin && (
              <IntegratedAdminLink href="/admin/integrated">
                통합 관리 →
              </IntegratedAdminLink>
            )}
          </TitleRow>
          <Subtitle>
            사용할 워크스페이스를 선택하거나, 관리자인 경우 새 워크스페이스를
            만들 수 있습니다.
          </Subtitle>

          {workspaces.length === 0 ? (
            <EmptyState>
              <EmptyTitle>워크스페이스가 없습니다</EmptyTitle>
              <EmptyText>
                {isAdmin
                  ? "아래 버튼으로 새 워크스페이스를 만들거나, 가입 승인을 기다려 주세요."
                  : "가입 승인이 완료되면 워크스페이스가 표시됩니다."}
              </EmptyText>
              {isServiceAdmin && (
                <UseButton onClick={() => setIsModalOpen(true)}>
                  워크스페이스 만들기
                </UseButton>
              )}
            </EmptyState>
          ) : (
            <>
              {workspaces.map((ws) => (
                <Card key={ws.id}>
                  <div>
                    <CardName>{ws.name}</CardName>
                    <CardMeta>
                      {ACCOUNT_TYPE_LABELS[ws.account_type] ?? ws.account_type}
                    </CardMeta>
                  </div>
                  <ButtonRow>
                    <UseButton onClick={() => handleUseWorkspace(ws, "map")}>
                      지도로 이동
                    </UseButton>
                    {isAdmin && (
                      <AdminButton
                        onClick={() => handleUseWorkspace(ws, "admin")}>
                        관리
                      </AdminButton>
                    )}
                  </ButtonRow>
                </Card>
              ))}
              {isServiceAdmin && (
                <CreateButton onClick={() => setIsModalOpen(true)}>
                  + 워크스페이스 만들기
                </CreateButton>
              )}
            </>
          )}
        </Container>

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
                  <ModalSelect
                    id="ws-account-type"
                    value={accountType}
                    onChange={(e) =>
                      setAccountType(
                        e.target.value as "listed_company" | "proxy_company",
                      )
                    }>
                    <option value="listed_company">상장사</option>
                    <option value="proxy_company">의결권 대행사</option>
                  </ModalSelect>
                </FormGroup>
                <ModalActions>
                  <SecondaryButton
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={createWorkspace.isPending}>
                    취소
                  </SecondaryButton>
                  <UseButton
                    type="submit"
                    disabled={createWorkspace.isPending || !name.trim()}>
                    {createWorkspace.isPending ? "생성 중..." : "생성"}
                  </UseButton>
                </ModalActions>
              </form>
            </ModalBox>
          </ModalOverlay>
        )}
      </Page>
    </>
  )
}
