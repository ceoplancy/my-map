import { useGetUserData } from "@/api/auth"
import DotSpinner from "@/component/dot-spinner"

const withAuth = (WrappedComponent: React.ComponentType<any>) => {
  const AuthComponent = (props: any) => {
    const { isLoading } = useGetUserData()

    if (isLoading) return <DotSpinner />

    return <WrappedComponent {...props} />
  }

  return AuthComponent
}

export default withAuth
