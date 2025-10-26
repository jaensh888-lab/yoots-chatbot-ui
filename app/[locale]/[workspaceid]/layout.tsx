"use client"

import { ReactNode, useContext, useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"

import { Dashboard } from "@/components/ui/dashboard"
import Loading from "../loading"

import { ChatbotUIContext } from "@/context/context"

import { getWorkspaceById } from "@/db/workspaces"
// УБРАНО: import { getAssistantWorkspacesByWorkspaceId } from "@/db/assistants"
import { getChatsByWorkspaceId } from "@/db/chats"
import { getCollectionWorkspacesByWorkspaceId } from "@/db/collections"
import { getFileWorkspacesByWorkspaceId } from "@/db/files"
import { getFoldersByWorkspaceId } from "@/db/folders"
import { getModelWorkspacesByWorkspaceId } from "@/db/models"
import { getPresetWorkspacesByWorkspaceId } from "@/db/presets"
import { getPromptWorkspacesByWorkspaceId } from "@/db/prompts"
import { getToolWorkspacesByWorkspaceId } from "@/db/tools"

import { convertBlobToBase64 } from "@/lib/blob-to-b64"
import type { LLMID } from "@/types"
import { supabase } from "@/supabase/browser-client"

/** Локальные типы для строгой типизации */
type WorkspaceLike = {
  id?: string
  default_model?: LLMID | null
  default_prompt?: string | null
  default_temperature?: number | null
  default_context_length?: number | null
  include_profile_context?: boolean | null
  include_workspace_instructions?: boolean | null
  embeddings_provider?: "openai" | "local" | null
}

type AssistantLink = {
  id: string
  image_path?: string | null
}

type AssistantWorkspaceLinks = {
  assistants: AssistantLink[]
}

/** Имя бакета для изображений ассистентов в Supabase Storage */
const ASSISTANT_IMAGES_BUCKET = "assistant-images"

interface WorkspaceLayoutProps {
  children: ReactNode
}

/** Локальная функция: ассистенты по workspace (2 запроса; RLS-friendly) */
async function fetchAssistantsByWorkspace(
  workspaceId: string
): Promise<AssistantLink[]> {
  const { data: links, error: linksErr } = await supabase
    .from("assistant_workspaces")
    .select("assistant_id")
    .eq("workspace_id", workspaceId)

  if (linksErr) {
    console.error("[assistants] links error", linksErr)
    return []
  }

  const ids = (links ?? []).map(l => l.assistant_id).filter(Boolean) as string[]
  if (ids.length === 0) return []

  const { data: assistantsData, error: assErr } = await supabase
    .from("assistants")
    .select("id, image_path")
    .in("id", ids)

  if (assErr) {
    console.error("[assistants] select error", assErr)
    return []
  }

  return (assistantsData ?? []) as AssistantLink[]
}

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const workspaceId = params.workspaceid as string

  const {
    setChatSettings,
    setAssistants,
    setAssistantImages,
    setChats,
    setCollections,
    setFolders,
    setFiles,
    setPresets,
    setPrompts,
    setTools,
    setModels,
    setSelectedWorkspace,
    setSelectedChat,
    setChatMessages,
    setUserInput,
    setIsGenerating,
    setFirstTokenReceived,
    setChatFiles,
    setChatImages,
    setNewMessageFiles,
    setNewMessageImages,
    setShowFilesDisplay
  } = useContext(ChatbotUIContext)

  const [loading, setLoading] = useState<boolean>(true)

  // Пускаем в workspace только авторизованных
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.push("/login")
        return
      }
      await fetchWorkspaceData(workspaceId)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Переключение workspace → сброс UI и загрузка свежих данных
  useEffect(() => {
    ;(async () => {
      await fetchWorkspaceData(workspaceId)
    })()

    setUserInput("")
    setChatMessages([])
    setSelectedChat(null)
    setIsGenerating(false)
    setFirstTokenReceived(false)
    setChatFiles([])
    setChatImages([])
    setNewMessageFiles([])
    setNewMessageImages([])
    setShowFilesDisplay(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId])

  const fetchWorkspaceData = async (wid: string) => {
    setLoading(true)

    // 1) Воркспейс
    const workspace = (await getWorkspaceById(wid)) as WorkspaceLike | null
    setSelectedWorkspace(workspace as any)

    // 2) Ассистенты (id + image_path)
    const assistants: AssistantLink[] = await fetchAssistantsByWorkspace(wid)
    setAssistants(assistants as any)

    // 3) Иконки ассистентов из Storage → base64
    type AssistantImagesParam = Parameters<typeof setAssistantImages>[0]
    const images = [] as unknown as AssistantImagesParam

    for (const a of assistants) {
      if (!a.image_path) continue

      const { data: blob, error } = await supabase.storage
        .from(ASSISTANT_IMAGES_BUCKET)
        .download(a.image_path)

      if (!error && blob) {
        const dataUrl = await convertBlobToBase64(blob)
        // @ts-expect-error приведение к ожидаемой форме из контекста
        images.push({ assistantId: a.id, base64: dataUrl as string })
      }
    }
    setAssistantImages(images)

    // 4) Остальные сущности
    const chats = await getChatsByWorkspaceId(wid)
    setChats(chats)

    // collections (функция возвращает объект)
    {
      const { collections = [] } =
        (await getCollectionWorkspacesByWorkspaceId(wid)) ?? { collections: [] }
      setCollections(collections as any)
    }

    const folders = await getFoldersByWorkspaceId(wid)
    setFolders(folders)

    // files / presets / prompts / tools / models (все — объекты с массивами)
    {
      const { files = [] } =
        (await getFileWorkspacesByWorkspaceId(wid)) ?? { files: [] }
      setFiles(files as any)
    }

    {
      const { presets = [] } =
        (await getPresetWorkspacesByWorkspaceId(wid)) ?? { presets: [] }
      setPresets(presets as any)
    }

    {
      const { prompts = [] } =
        (await getPromptWorkspacesByWorkspaceId(wid)) ?? { prompts: [] }
      setPrompts(prompts as any)
    }

    {
      const { tools = [] } =
        (await getToolWorkspacesByWorkspaceId(wid)) ?? { tools: [] }
      setTools(tools as any)
    }

    {
      const { models = [] } =
        (await getModelWorkspacesByWorkspaceId(wid)) ?? { models: [] }
      setModels(models as any)
    }

    // 5) Настройки чата
    setChatSettings({
      model: (searchParams.get("model") ||
        workspace?.default_model ||
        "gpt-4-1106-preview") as LLMID,
      prompt:
        workspace?.default_prompt ?? "You are a friendly, helpful AI assistant.",
      temperature: workspace?.default_temperature ?? 0.5,
      contextLength: workspace?.default_context_length ?? 4096,
      includeProfileContext: workspace?.include_profile_context ?? true,
      includeWorkspaceInstructions:
        workspace?.include_workspace_instructions ?? true,
      embeddingsProvider:
        (workspace?.embeddings_provider as "openai" | "local") ?? "openai"
    })

    setLoading(false)
  }

  if (loading) return <Loading />

  return <Dashboard>{children}</Dashboard>
}
