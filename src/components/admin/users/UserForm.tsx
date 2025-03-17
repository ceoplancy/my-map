import { useCreateUser, useUpdateUser, useGetFilterMenu } from "@/api/supabase"
import { useState } from "react"
import styled from "@emotion/styled"

const Modal = styled.div`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
`

const ModalContent = styled.div`
  background-color: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
  width: 100%;
  max-width: 28rem;
`

const Title = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: #1f2937;
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.25rem;
`

const Input = styled.input`
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  width: 100%;
  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 1px #2563eb;
  }
`

const Select = styled.select`
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  width: 100%;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1rem;

  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 1px #2563eb;
  }
`

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
`

const CancelButton = styled.button`
  padding: 0.5rem 1rem;
  color: #374151;
  border-radius: 0.375rem;
  &:hover {
    background-color: #f3f4f6;
  }
`

const SaveButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: #2563eb;
  color: white;
  border-radius: 0.375rem;
  &:hover {
    background-color: #1d4ed8;
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
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  cursor: pointer;

  &:hover {
    background-color: #f3f4f6;
  }
`

const Checkbox = styled.input`
  cursor: pointer;
`

interface UserFormProps {
  user?: any
  onClose: () => void
}

export default function UserForm({ user, onClose }: UserFormProps) {
  const { data: filterMenu } = useGetFilterMenu()
  const [formData, setFormData] = useState({
    email: user?.email || "",
    password: "",
    name: user?.user_metadata?.name || "",
    role: user?.user_metadata?.role || "user",
    allowedStatus: user?.user_metadata?.allowedStatus || [],
    allowedCompany: user?.user_metadata?.allowedCompany || [],
  })

  const createUserMutation = useCreateUser()
  const updateUserMutation = useUpdateUser()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const userData = {
      name: formData.name,
      role: formData.role,
      allowedStatus: formData.allowedStatus,
      allowedCompany: formData.allowedCompany,
    }

    if (user) {
      updateUserMutation.mutate({
        userId: user.id,
        updates: {
          email: formData.email,
          user_metadata: userData,
        },
      })
    } else {
      createUserMutation.mutate({
        email: formData.email,
        password: formData.password,
        userData,
      })
    }

    onClose()
  }

  const handleStatusChange = (status: string) => {
    setFormData((prev) => ({
      ...prev,
      allowedStatus: prev.allowedStatus.includes(status)
        ? prev.allowedStatus.filter((s: string) => s !== status)
        : [...prev.allowedStatus, status],
    }))
  }

  const handleCompanyChange = (company: string) => {
    setFormData((prev) => ({
      ...prev,
      allowedCompany: prev.allowedCompany.includes(company)
        ? prev.allowedCompany.filter((c: string) => c !== company)
        : [...prev.allowedCompany, company],
    }))
  }

  return (
    <Modal>
      <ModalContent>
        <Title>{user ? "사용자 수정" : "새 사용자 추가"}</Title>
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label>이메일</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
          </FormGroup>
          {!user && (
            <FormGroup>
              <Label>비밀번호</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
              />
            </FormGroup>
          )}
          <FormGroup>
            <Label>이름</Label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </FormGroup>
          <FormGroup>
            <Label>권한</Label>
            <Select
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }>
              <option value="user">일반 사용자</option>
              <option value="admin">관리자</option>
            </Select>
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
            <Label>조회 가능한 회사</Label>
            <CheckboxGroup>
              {filterMenu?.companyMenu?.map((company) => (
                <CheckboxLabel key={company}>
                  <Checkbox
                    type="checkbox"
                    checked={formData.allowedCompany.includes(company)}
                    onChange={() => handleCompanyChange(company)}
                  />
                  {company}
                </CheckboxLabel>
              ))}
            </CheckboxGroup>
          </FormGroup>
          <ButtonGroup>
            <CancelButton type="button" onClick={onClose}>
              취소
            </CancelButton>
            <SaveButton type="submit">저장</SaveButton>
          </ButtonGroup>
        </Form>
      </ModalContent>
    </Modal>
  )
}
