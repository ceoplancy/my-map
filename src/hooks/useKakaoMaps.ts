export const useKakaoMaps = () => {
  const waitForKakaoMaps = () => {
    return new Promise((resolve, reject) => {
      const checkKakao = () => {
        if (window.kakaoMapsLoaded && window.kakao?.maps?.services) {
          return true
        }

        return false
      }

      if (checkKakao()) {
        resolve(true)

        return
      }

      let retryCount = 0
      const maxRetries = 50

      const interval = setInterval(() => {
        retryCount++
        if (checkKakao()) {
          clearInterval(interval)
          resolve(true)

          return
        }

        if (retryCount >= maxRetries) {
          clearInterval(interval)
          reject(new Error("Kakao Maps SDK 로드 실패"))
        }
      }, 100)

      setTimeout(() => {
        clearInterval(interval)
        if (!checkKakao()) {
          reject(new Error("Kakao Maps SDK 로드 실패: 타임아웃"))
        }
      }, 10000)
    })
  }

  return { waitForKakaoMaps }
}
