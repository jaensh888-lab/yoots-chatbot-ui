// db/assistants.ts

import { supabase } from "@/lib/supabase/browser-client"
import { TablesInsert, TablesUpdate } from "@/supabase/types"

/** Минимальная форма ассистента */
export type AssistantLink = {
  id: string
  image_path?: string | null
}

export type AssistantWorkspaceLinks = {
  assistants: AssistantLink[]
}

/* =========================
 * READ
 * ========================= */

export const getAssistantById = async (assistantId: string) => {
  const { data: assistant, error } = await supabase
    .from("assistants")
    .select("*")
    .eq("id", assistantId)
    .single()

  if (!assistant) throw new Error(error?.message || "Assistant not found")
  return assistant
}

/** Ассистенты по воркспейсу: 2 запроса (надёжно при строгих RLS) */
export const getAssistantWorkspacesByWorkspaceId = async (
  workspaceId: string
): Promise<AssistantWorkspaceLinks | null> => {
  const { data: links, error: linksErr } = await supabase
    .from("assistant_workspaces")
    .select("assistant_id")
    .eq("workspace_id", workspaceId)

  if (linksErr) {
    console.error("[assistants] links error", linksErr)
    return null
  }

  const ids = (links ?? []).map(l => l.assistant_id).filter(Boolean) as string[]
  if (ids.length === 0) return { assistants: [] }

  const { data: assistantsData, error: assErr } = await supabase
    .from("assistants")
    .select("id, image_path")
    .in("id", ids)

  if (assErr) {
    console.error("[assistants] assistants error", assErr)
    return null
  }

  return { assistants: (assistantsData ?? []) as AssistantLink[] }
}

export const getAssistantWorkspacesByAssistantId = async (assistantId: string) => {
  const { data: assistant, error } = await supabase
    .from("assistants")
    .select(`id, name, workspaces (*)`)
    .eq("id", assistantId)
    .single()

  if (!assistant) throw new Error(error?.message || "Assistant not found")
  return assistant
}

/* =========================
 * CREATE
 * ========================= */

export const createAssistant = async (
  assistant: TablesInsert<"assistants">,
  workspace_id: string
) => {
  const { data: createdAssistant, error } = await supabase
    .from("assistants")
    .insert([assistant])
    .select("*")
    .single()

  if (error) throw new Error(error.message)

  await createAssistantWorkspace({
    user_id: createdAssistant.user_id,
    assistant_id: createdAssistant.id,
    workspace_id
  })

  return createdAssistant
}

export const createAssistants = async (
  assistants: TablesInsert<"assistants">[],
  workspace_id: string
) => {
  const { data: createdAssistants, error } = await supabase
    .from("assistants")
    .insert(assistants)
    .select("*")

  if (error) throw new Error(error.message)

  await createAssistantWorkspaces(
    createdAssistants.map(assistant => ({
      user_id: assistant.user_id,
      assistant_id: assistant.id,
      workspace_id
    }))
  )

  return createdAssistants
}

export const createAssistantWorkspace = async (item: {
  user_id: string
  assistant_id: string
  workspace_id: string
}) => {
  const { data, error } = await supabase
    .from("assistant_workspaces")
    .insert([item])
    .select("*")
  if (error) throw new Error(error.message)
  return data?.[0]
}

export const createAssistantWorkspaces = async (
  items: { user_id: string; assistant_id: string; workspace_id: string }[]
) => {
  const { data, error } = await supabase
    .from("assistant_workspaces")
    .insert(items)
    .select("*")
  if (error) throw new Error(error.message)
  return data
}

/* =========================
 * UPDATE / DELETE
 * ========================= */

export const updateAssistant = async (
  assistantId: string,
  assistant: TablesUpdate<"assistants">
) => {
  const { data, error } = await supabase
    .from("assistants")
    .update(assistant)
    .eq("id", assistantId)
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  return data
}

export const deleteAssistant = async (assistantId: string) => {
  const { error } = await supabase
    .from("assistants")
    .delete()
    .eq("id", assistantId)

  if (error) throw new Error(error.message)
  return true
}

export const deleteAssistantWorkspace = async (
  assistantId: string,
  workspaceId: string
) => {
  const { error } = await supabase
    .from("assistant_workspaces")
    .delete()
    .eq("assistant_id", assistantId)
    .eq("workspace_id", workspaceId)

  if (error) throw new Error(error.message)
  return true
}
