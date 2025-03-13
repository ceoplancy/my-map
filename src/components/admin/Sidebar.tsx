import { COLORS } from "@/styles/global-style"
import Link from "next/link"
import { useRouter } from "next/router"
import styled from "@emotion/styled"
import {
  Dashboard,
  People,
  Description,
  CloudUpload,
} from "@mui/icons-material"

const SidebarContainer = styled.div`
  width: 16rem;
  background-color: ${COLORS.white};
  box-shadow: 4px 0 6px -1px rgba(0, 0, 0, 0.1);
  height: 100%;
  border-right: 1px solid #e5e7eb;
`

const LogoContainer = styled.div`
  padding: 1.5rem;
`

const LogoSection = styled.div`
  padding: 1.5rem;
`

const LogoText = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  text-align: center;
  color: ${COLORS.gray[900]};
`

const Navigation = styled.nav`
  margin-top: 1.5rem;
`

const NavLink = styled(Link)<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  color: ${COLORS.gray[700]};
  text-decoration: none;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${COLORS.gray[100]};
  }

  ${(props) =>
    props.$active &&
    `
    background-color: ${COLORS.gray[100]};
  `}
`

const NavIcon = styled.span`
  margin-right: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
`

const NavText = styled.span`
  font-size: 0.875rem;
  font-weight: 500;
`

export default function Sidebar() {
  const router = useRouter()

  const menuItems = [
    { title: "대시보드", path: "/admin", icon: <Dashboard /> },
    { title: "사용자 관리", path: "/admin/users", icon: <People /> },
    {
      title: "주주명부 관리",
      path: "/admin/shareholders",
      icon: <Description />,
    },
    {
      title: "엑셀 업로드",
      path: "/admin/excel-import",
      icon: <CloudUpload />,
    },
  ]

  return (
    <SidebarContainer>
      <LogoContainer>
        <LogoSection>
          <LogoText>관리자 패널</LogoText>
        </LogoSection>
      </LogoContainer>
      <Navigation>
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            href={item.path}
            $active={router.pathname === item.path}>
            <NavIcon>{item.icon}</NavIcon>
            <NavText>{item.title}</NavText>
          </NavLink>
        ))}
      </Navigation>
    </SidebarContainer>
  )
}
