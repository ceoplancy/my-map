import { atom, useRecoilState } from "recoil"
import { recoilPersist } from "recoil-persist"

const { persistAtom } = recoilPersist({
  key: "current-workspace",
  storage: typeof window !== "undefined" ? localStorage : undefined,
})

export type WorkspaceItem = {
  id: string
  name: string
  account_type: string
}

export const currentWorkspaceState = atom<WorkspaceItem | null>({
  key: "current-workspace-state",
  default: null,
  effects_UNSTABLE: [persistAtom],
})

export const useCurrentWorkspace = () => {
  return useRecoilState(currentWorkspaceState)
}
