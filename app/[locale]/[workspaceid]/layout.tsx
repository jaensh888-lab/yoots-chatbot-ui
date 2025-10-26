"use client";

import { useContext, useEffect, useState, ReactNode } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { Dashboard } from "@/components/ui/dashboard";
import Loading from "../loading";

import { ChatbotUIContext } from "@/context/context";

import { getWorkspaceById } from "@/db/workspaces";
import { getChatsByWorkspaceId } from "@/db/chats";
import { getCollectionWorkspacesByWorkspaceId } from "@/db/collections";
import { getFoldersByWorkspaceId } from "@/db/folders";
import { getFileWorkspacesByWorkspaceId } from "@/db/files";
import { getPresetWorkspacesByWorkspaceId } from "@/db/presets";
import { getPromptWorkspacesByWorkspaceId } from "@/db/prompts";
import { getToolWorkspacesByWorkspaceId } from "@/db/tools";
import { getModelWorkspacesByWorkspaceId } from "@/db/models";
import { getAssistantImageFromStorage } from "@/db/storage/assistant-images";

import { convertBlobToBase64 } from "@/lib/blob-to-b64";
import type { LLMID } from "@/types";

// Единый браузерный клиент Supabase
import { supabase } from "@/supabase/browser-client";
// Типы БД
import type { Database } from "@/supabase/types";

interface WorkspaceLayoutProps {
  children: ReactNode;
}

/** Минимальный тип, чтобы безопасно читать поля workspace */
type WorkspaceLike = {
  id?: string;
  default_model?: LLMID | null;
  default_prompt?: string | null;
  default_temperature?: number | null;
  default_context_length?: number | null;
  include_profile_context?: boolean | null;
  include_workspace_instructions?: boolean | null;
  embeddings_provider?: "openai" | "local" | null;
};

type AssistantRow = Database["public"]["Tables"]["assistants"]["Row"];

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const workspaceId = params.workspaceid as string;

  const {
    // состояние UI/данных
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
  } = useContext(ChatbotUIContext);

  const [loading, setLoading] = useState(true);

  // Пускаем в workspace только при наличии сессии
  useEffect(() => {
    (async () => {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) {
        router.push("/login");
        return;
      }
      await fetchWorkspaceData(workspaceId);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Переключение workspace → сброс и подгрузка
  useEffect(() => {
    (async () => {
      await fetchWorkspaceData(workspaceId);
    })();

    setUserInput("");
    setChatMessages([]);
    setSelectedChat(null);

    setIsGenerating(false);
    setFirstTokenReceived(false);

    setChatFiles([]);
    setChatImages([]);
    setNewMessageFiles([]);
    setNewMessageImages([]);
    setShowFilesDisplay(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const fetchWorkspaceData = async (wid: string) => {
    setLoading(true);

    // 1) Workspace
    const workspace = (await getWorkspaceById(wid)) as WorkspaceLike | null;
    setSelectedWorkspace(workspace as any);

    // 2) Assistants — берём ПОЛНЫЕ строки таблицы
    const { data: assistantRows, error: aErr } = await supabase
      .from("assistants")
      .select("*")
      .eq("workspace_id", wid);

    if (aErr) throw new Error(aErr.message);

    setAssistants((assistantRows ?? []) as AssistantRow[]);

    // 2a) Картинки ассистентов
    const imageMap: Record<string, string> = {};
    for (const a of assistantRows ?? []) {
      if (a.image_path) {
        const blob = await getAssistantImageFromStorage(a.image_path);
        if (blob) {
          imageMap[a.id] = await convertBlobToBase64(blob);
        }
      }
    }
    setAssistantImages(imageMap);

    // 3) Остальные сущности
    const chats = await getChatsByWorkspaceId(wid);
    setChats(chats);

    const collections = await getCollectionWorkspacesByWorkspaceId(wid);
    setCollections(collections.collections);

    const folders = await getFoldersByWorkspaceId(wid);
    setFolders(folders);

    const files = await getFileWorkspacesByWorkspaceId(wid);
    setFiles(files.files);

    const presets = await getPresetWorkspacesByWorkspaceId(wid);
    setPresets(presets.presets);

    const prompts = await getPromptWorkspacesByWorkspaceId(wid);
    setPrompts(prompts.prompts);

    const tools = await getToolWorkspacesByWorkspaceId(wid);
    setTools(tools.tools);

    const models = await getModelWorkspacesByWorkspaceId(wid);
    setModels(models.models);

    // 4) Настройки чата с безопасными дефолтами
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
    });

    setLoading(false);
  };

  if (loading) return <Loading />;

  return <Dashboard>{children}</Dashboard>;
}
