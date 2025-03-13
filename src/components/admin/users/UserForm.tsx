import { useCreateUser, useUpdateUser } from "@/api/supabase"
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

interface UserFormProps {
  user?: any
  onClose: () => void
}

export default function UserForm({ user, onClose }: UserFormProps) {
  const [formData, setFormData] = useState({
    email: user?.email || "",
    password: "",
    name: user?.user_metadata?.name || "",
    role: user?.user_metadata?.role || "user",
  })

  const createUserMutation = useCreateUser()
  const updateUserMutation = useUpdateUser()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (user) {
      updateUserMutation.mutate({
        userId: user.id,
        updates: {
          email: formData.email,
          user_metadata: {
            name: formData.name,
            role: formData.role,
          },
        },
      })
    } else {
      createUserMutation.mutate({
        email: formData.email,
        password: formData.password,
        userData: {
          name: formData.name,
          role: formData.role,
        },
      })
    }

    onClose()
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
