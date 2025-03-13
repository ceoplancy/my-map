import Lottie from "lottie-react"
import { useEffect, useState } from "react"

export const SignInAnimation = () => {
  const [animationData, setAnimationData] = useState(null)

  useEffect(() => {
    fetch("https://assets2.lottiefiles.com/packages/lf20_jcikwtux.json")
      .then((res) => res.json())
      .then((data) => setAnimationData(data))
  }, [])

  if (!animationData) return null

  return (
    <Lottie
      animationData={animationData}
      loop
      autoplay
      style={{
        width: "100%",
        maxWidth: "600px",
        margin: "0 auto",
      }}
    />
  )
}
