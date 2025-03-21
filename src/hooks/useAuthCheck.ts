import { useGetUserData } from "@/api/auth"
import { useEffect, useState } from "react"

const useAuthCheck = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const { data } = useGetUserData()

  useEffect(() => {
    if (!data) {
      setIsLoggedIn(false)

      return
    }

    if (data !== undefined) {
      setIsLoggedIn(true)

      return
    }
  }, [data])

  return isLoggedIn
}

export default useAuthCheck
