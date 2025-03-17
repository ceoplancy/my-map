import { User } from "@supabase/supabase-js"
import styled from "@emotion/styled"
import { COLORS } from "@/styles/global-style"
import { useState } from "react"
import { useUpdateUser, useGetFilterMenu } from "@/api/supabase"

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
  max-width: 32rem;
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

const Select = styled.select`
  padding: 0.75rem 1rem;
  border: 1px solid ${COLORS.gray[200]};
  border-radius: 0.5rem;
  font-size: 1rem;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1rem;

  &:focus {
    border-color: ${COLORS.blue[500]};
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

interface Props {
  user: User
  onClose: () => void
}

export default function UserDetailModal({ user, onClose }: Props) {
  const { data: filterMenu } = useGetFilterMenu()
  const { mutate: updateUser } = useUpdateUser()
  const [formData, setFormData] = useState({
    email: user.email,
    name: user.user_metadata?.name || "",
    role: user.user_metadata?.role || "user",
    allowedStatus: user.user_metadata?.allowedStatus || [],
    allowedCompany: user.user_metadata?.allowedCompany || [],
  })

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
            allowedCompany: formData.allowedCompany,
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

  const handleCompanyChange = (company: string) => {
    setFormData((prev) => ({
      ...prev,
      allowedCompany: prev.allowedCompany.includes(company)
        ? prev.allowedCompany.filter((c: string) => c !== company)
        : [...prev.allowedCompany, company],
    }))
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
