import type { User } from "@supabase/supabase-js"
import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import { useState } from "react"
import {
  useUpdateUser,
  useGetFilterMenu,
  useAdminUserWorkspaces,
  useAdminWorkspaces,
  useAddOrUpdateAdminUserWorkspace,
  useRemoveAdminUserWorkspace,
  type UserWorkspaceMembership,
} from "@/api/supabase"
import { AUTH_ROLE_LABELS, AUTH_ROLES, type AuthRole } from "@/types/auth"
import { WORKSPACE_ROLE_LABELS } from "@/constants/roles"
import type { WorkspaceRole } from "@/types/db"
import Select from "@/components/ui/select"

type AssignableWorkspaceRole = "top_admin" | "admin" | "field_agent"

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
`

const Modal = styled.div`
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  width: 100%;
  max-width: 36rem;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
`

const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${COLORS.gray[900]};
  margin-bottom: 1.5rem;
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const Label = styled.label`
  font-weight: 500;
  color: ${COLORS.gray[700]};
`

const Input = styled.input`
  padding: 0.75rem 1rem;
  border: 1px solid ${COLORS.gray[200]};
  border-radius: 0.5rem;
  font-size: 1rem;

  &:focus {
    border-color: ${COLORS.blue[500]};
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`

const ModalSelect = styled(Select)`
  width: 100%;
  padding: 0.75rem 2rem 0.75rem 0.75rem;
  font-size: 1rem;
  &:focus {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
`

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  transition: all 0.2s ease;

  &.cancel {
    color: ${COLORS.gray[600]};
    background: ${COLORS.gray[100]};

    &:hover {
      background: ${COLORS.gray[200]};
    }
  }

  &.save {
    color: white;
    background: ${COLORS.blue[500]};

    &:hover {
      background: ${COLORS.blue[600]};
    }
  }
`

const CheckboxGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
`

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border: 1px solid ${COLORS.gray[200]};
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${COLORS.gray[50]};
  }
`

const Checkbox = styled.input`
  cursor: pointer;
`

const ASSIGNABLE_WORKSPACE_ROLES: WorkspaceRole[] = [
  "top_admin",
  "admin",
  "field_agent",
]

const SectionTitle = styled.div`
  font-weight: 600;
  color: ${COLORS.gray[800]};
  font-size: 0.9375rem;
  margin-bottom: 0.5rem;
`

const SectionHint = styled.div`
  font-size: 0.8125rem;
  color: ${COLORS.gray[500]};
  margin-bottom: 0.75rem;
`

const WorkspaceList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
`

const WorkspaceRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: ${COLORS.gray[50]};
  border-radius: 0.5rem;
  border: 1px solid ${COLORS.gray[200]};
`

const WorkspaceName = styled.span`
  flex: 1;
  font-weight: 500;
  color: ${COLORS.gray[800]};
  min-width: 0;
`

const RoleSelect = styled(Select)`
  min-width: 8rem;
  padding: 0.375rem 0.5rem;
  font-size: 0.875rem;
`

const RemoveBtn = styled.button`
  padding: 0.375rem 0.5rem;
  font-size: 0.8125rem;
  color: ${COLORS.red[600]};
  background: ${COLORS.red[50]};
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;

  &:hover {
    background: ${COLORS.red[100]};
  }
`

const AddRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 0.75rem 0;
  border-top: 1px dashed ${COLORS.gray[300]};
`

const AddSelect = styled(Select)`
  min-width: 10rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
`

const AddButton = styled.button`
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: white;
  background: ${COLORS.blue[500]};
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;

  &:hover {
    background: ${COLORS.blue[600]};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

interface Props {
  user: User
  onClose: () => void
}

export default function UserDetailModal({ user, onClose }: Props) {
  const { data: filterMenu } = useGetFilterMenu()
  const { mutate: updateUser } = useUpdateUser()
  const { data: workspaceMemberships = [], isLoading: loadingWorkspaces } =
    useAdminUserWorkspaces(user.id)
  const { data: allWorkspaces = [] } = useAdminWorkspaces()
  const addOrUpdateWorkspace = useAddOrUpdateAdminUserWorkspace(user.id)
  const removeWorkspace = useRemoveAdminUserWorkspace(user.id)

  const [formData, setFormData] = useState<{
    email: string
    name: string
    role: AuthRole
    allowedStatus: string[]
  }>({
    email: user.email ?? "",
    name: user.user_metadata?.name || "",
    role: (user.user_metadata?.role as AuthRole) || "user",
    allowedStatus: user.user_metadata?.allowedStatus || [],
  })
  const [addWorkspaceId, setAddWorkspaceId] = useState("")
  const [addRole, setAddRole] = useState<AssignableWorkspaceRole>("field_agent")

  const assignedWorkspaceIds = workspaceMemberships.map((m) => m.workspaceId)
  const availableWorkspaces = allWorkspaces.filter(
    (w) => !assignedWorkspaceIds.includes(w.id),
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    updateUser(
      {
        userId: user.id,
        updates: {
          email: formData.email,
          user_metadata: {
            name: formData.name,
            role: formData.role,
            allowedStatus: formData.allowedStatus,
          },
        },
      },
      {
        onSettled: () => {
          onClose()
        },
      },
    )
  }

  const handleStatusChange = (status: string) => {
    setFormData((prev) => ({
      ...prev,
      allowedStatus: prev.allowedStatus.includes(status)
        ? prev.allowedStatus.filter((s: string) => s !== status)
        : [...prev.allowedStatus, status],
    }))
  }

  const handleWorkspaceRoleChange = (
    membership: UserWorkspaceMembership,
    newRole: WorkspaceRole,
  ) => {
    if (newRole === "service_admin") return
    addOrUpdateWorkspace.mutate({
      workspaceId: membership.workspaceId,
      role: newRole as AssignableWorkspaceRole,
    })
  }

  const handleAddWorkspace = () => {
    if (!addWorkspaceId) return
    addOrUpdateWorkspace.mutate(
      { workspaceId: addWorkspaceId, role: addRole },
      {
        onSuccess: () => {
          setAddWorkspaceId("")
          setAddRole("field_agent")
        },
      },
    )
  }

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Title>사용자 상세 정보</Title>
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label>이메일</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </FormGroup>
          <FormGroup>
            <Label>이름</Label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="사용자 이름을 입력하세요"
            />
          </FormGroup>
          <FormGroup>
            <Label>권한</Label>
            <ModalSelect
              value={formData.role}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  role: e.target.value as AuthRole,
                })
              }>
              {AUTH_ROLES.map((r) => (
                <option key={r} value={r}>
                  {AUTH_ROLE_LABELS[r]}
                </option>
              ))}
            </ModalSelect>
          </FormGroup>
          <FormGroup>
            <Label>조회 가능한 상태</Label>
            <CheckboxGroup>
              {filterMenu?.statusMenu?.map((status) => (
                <CheckboxLabel key={status}>
                  <Checkbox
                    type="checkbox"
                    checked={formData.allowedStatus.includes(status)}
                    onChange={() => handleStatusChange(status)}
                  />
                  {status}
                </CheckboxLabel>
              ))}
            </CheckboxGroup>
          </FormGroup>
          <FormGroup>
            <SectionTitle>워크스페이스 권한</SectionTitle>
            <SectionHint>
              이 사용자가 접근할 수 있는 워크스페이스와 역할입니다. 워크스페이스
              관리의 사용자 목록과 동일한 데이터를 사용합니다.
            </SectionHint>
            {loadingWorkspaces ? (
              <div style={{ color: COLORS.gray[500], fontSize: "0.875rem" }}>
                불러오는 중...
              </div>
            ) : (
              <>
                <WorkspaceList>
                  {workspaceMemberships.map((m) => (
                    <WorkspaceRow key={m.memberId}>
                      <WorkspaceName title={m.workspaceName}>
                        {m.workspaceName || m.workspaceId}
                      </WorkspaceName>
                      <RoleSelect
                        value={m.role}
                        onChange={(e) =>
                          handleWorkspaceRoleChange(
                            m,
                            e.target.value as WorkspaceRole,
                          )
                        }
                        disabled={addOrUpdateWorkspace.isPending}>
                        {(m.role === "service_admin"
                          ? ([
                              "service_admin",
                              ...ASSIGNABLE_WORKSPACE_ROLES,
                            ] as WorkspaceRole[])
                          : ASSIGNABLE_WORKSPACE_ROLES
                        ).map((r) => (
                          <option key={r} value={r}>
                            {WORKSPACE_ROLE_LABELS[r]}
                          </option>
                        ))}
                      </RoleSelect>
                      <RemoveBtn
                        type="button"
                        onClick={() => removeWorkspace.mutate(m.workspaceId)}
                        disabled={removeWorkspace.isPending}>
                        제거
                      </RemoveBtn>
                    </WorkspaceRow>
                  ))}
                </WorkspaceList>
                <AddRow>
                  <AddSelect
                    value={addWorkspaceId}
                    onChange={(e) => setAddWorkspaceId(e.target.value)}
                    disabled={addOrUpdateWorkspace.isPending}>
                    <option value="">워크스페이스 선택</option>
                    {availableWorkspaces.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </AddSelect>
                  <AddSelect
                    value={addRole}
                    onChange={(e) =>
                      setAddRole(e.target.value as AssignableWorkspaceRole)
                    }
                    disabled={addOrUpdateWorkspace.isPending}>
                    {ASSIGNABLE_WORKSPACE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {WORKSPACE_ROLE_LABELS[r]}
                      </option>
                    ))}
                  </AddSelect>
                  <AddButton
                    type="button"
                    onClick={handleAddWorkspace}
                    disabled={
                      !addWorkspaceId || addOrUpdateWorkspace.isPending
                    }>
                    워크스페이스 추가
                  </AddButton>
                </AddRow>
                {availableWorkspaces.length === 0 &&
                  workspaceMemberships.length > 0 && (
                    <div
                      style={{
                        fontSize: "0.8125rem",
                        color: COLORS.gray[500],
                      }}>
                      모든 워크스페이스에 이미 배정되었습니다.
                    </div>
                  )}
              </>
            )}
          </FormGroup>
          <ButtonGroup>
            <Button type="button" className="cancel" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" className="save">
              저장
            </Button>
          </ButtonGroup>
        </Form>
      </Modal>
    </Overlay>
  )
}
