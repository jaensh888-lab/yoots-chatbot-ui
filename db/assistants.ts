// db/collections.ts
import { supabase } from "@/lib/supabase/browser-client"

export type CollectionLite = {
  id: string
  name?: string | null
  image_path?: string | null
  // добавь сюда поля, которые реально используешь в UI (slug, description и т.п.)
}

export type WorkspaceCollections = {
  collections: CollectionLite[]
}

/**
 * Возвращает коллекции, «привязанные» к workspace.
 * Реализация в два запроса — надёжно при строгих RLS.
 */
export async function getCollectionWorkspacesByWorkspaceId(
  workspaceId: string
): Promise<WorkspaceCollections> {
  // 1) связи коллекций с воркспейсом
  const { data: links, error: linksErr } = await supabase
    .from("collection_workspaces")
    .select("collection_id")
    .eq("workspace_id", workspaceId)

  if (linksErr) {
    console.error("[collections] links error", linksErr)
    return { collections: [] }
  }

  const ids = (links ?? []).map(l => l.collection_id).filter(Boolean) as string[]
  if (ids.length === 0) return { collections: [] }

  // 2) сами коллекции (минимум id, name, image_path)
  const { data: rows, error: rowsErr } = await supabase
    .from("collections")
    .select("id, name, image_path")
    .in("id", ids)

  if (rowsErr) {
    console.error("[collections] select error", rowsErr)
    return { collections: [] }
  }

  return { collections: (rows ?? []) as CollectionLite[] }
}
export {
  getAssistantById,
  getAssistantWorkspacesByWorkspaceId,
  getAssistantWorkspacesByAssistantId,
  createAssistant,
  createAssistants,
  createAssistantWorkspace,
  createAssistantWorkspaces,
  updateAssistant,
  deleteAssistant,
  deleteAssistantWorkspace,
}
