import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { MyWorkspaceItem } from "@/types/db"

/** Current workspace (shape from DB workspaces). */
export type WorkspaceItem = MyWorkspaceItem

interface WorkspaceState {
  currentWorkspace: MyWorkspaceItem | null
  setCurrentWorkspace: (
    _v:
      | MyWorkspaceItem
      | null
      | ((_prev: MyWorkspaceItem | null) => MyWorkspaceItem | null),
  ) => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      currentWorkspace: null,
      setCurrentWorkspace: (v) =>
        set((s) => ({
          currentWorkspace: typeof v === "function" ? v(s.currentWorkspace) : v,
        })),
    }),
    { name: "current-workspace" },
  ),
)

export const useCurrentWorkspace = () => {
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace)
  const setCurrentWorkspace = useWorkspaceStore((s) => s.setCurrentWorkspace)

  return [currentWorkspace, setCurrentWorkspace] as const
}
