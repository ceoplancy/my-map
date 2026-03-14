import { getBearerToken, isServiceAdmin } from "@/lib/api-auth"
import { withApiHandler } from "@/lib/withApiHandler"

export default withApiHandler(async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }
  const token = getBearerToken(req)
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" })
  }
  const isAdmin = await isServiceAdmin(token)

  return res.status(200).json({ isServiceAdmin: isAdmin })
})
