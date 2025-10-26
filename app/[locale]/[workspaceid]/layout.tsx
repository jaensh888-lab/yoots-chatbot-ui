"use client";

import { useContext, useEffect, useState, ReactNode } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { Dashboard } from "@/components/ui/dashboard";
import { ChatbotUIContext } from "@/context/context";

import { getChatsByWorkspaceId } from "@/db/chats";
import { getCollectionWorkspacesByWorkspaceId } from "@/db/collections";
import { getFileWorkspacesByWorkspaceId } from "@/db/files";
import { getFoldersByWorkspaceId } from "@/db/folders";
import { getModelWorkspacesByWorkspaceId } from "@/db/models";
import { getPresetWorkspacesByWorkspaceId } from "@/db/presets";
import { getPromptWorkspacesByWorkspaceId } from "@/db/prompts";
import { getToolWorkspacesByWorkspaceId } from "@/db/tools";
import { getWorkspaceById } from "@/db/workspaces";

import { convertBlobToBase64 } from "@/lib/blob-to-b64";

// единый браузерный клиент Supabase
import { supabase } from "@/supabase/browser-client";
import type { Database } from "@/supabase/types";

import type { LLMID } from "@/types";
import Loading from "../loading";

interface WorkspaceLayoutProps {
  children: ReactNode;
}

/** Минимальный тип воркспейса, чтобы безопасно читать поля по умолчанию */
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

// тип строки ассистента из БД
type AssistantRow = Database["public"]["Tables"]["assistants"]["Row"];

const ASSISTANT_IMAGES_BUCKET = "assistant-images"; // <— поменяй, если у тебя другое имя

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const workspaceId = params.workspaceid as string;

  const {
    // состояние, которое мы наполняем
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

  // пускаем сюда только авторизованных
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
        return;
      }
      await fetchWorkspaceData(workspaceId);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // при переключении воркспейса — сбрасываем чат и тянем новые данные
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

    // 1) сам воркспейс
    const workspace = (await getWorkspaceById(wid)) as WorkspaceLike | null;
    setSelectedWorkspace(workspace as any);

    // 2) ассистенты (полные строки, чтобы тип совпадал с состоянием)
    const { data: assistantsFull, error: assistantsErr } = await supabase
      .from("assistants")
      .select("*")
      .eq("workspace_id", wid);

    if (assistantsErr) {
      throw new Error(assistantsErr.message);
    }

    const assistants = (assistantsFull ?? []) as AssistantRow[];
    setAssistants(assistants);

    // 3) картинки ассистентов — строго Blob -> base64
    const imageMap: Record<string, string> = {};
    for (const a of assistants) {
      const path = a.image_path;
      if (path) {
        const { data: blob, error } = await supabase
          .storage
          .from(ASSISTANT_IMAGES_BUCKET)
          .download(path); // <- это вернёт Blob

        if (!error && blob) {
          imageMap[a.id] = await convertBlobToBase64(blob);
        }
      }
    }
    setAssistantImages(imageMap);

    // 4) остальное
    const chats = await getChatsByWorkspaceId(wid);
    setChats(chats);

    const collectionData = await getCollectionWorkspacesByWorkspaceId(wid);
    setCollections(collectionData.collections);

    const folders = await getFoldersByWorkspaceId(wid);
    setFolders(folders);

    const fileData = await getFileWorkspacesByWorkspaceId(wid);
    setFiles(fileData.files);

    const presetData = await getPresetWorkspacesByWorkspaceId(wid);
    setPresets(presetData.presets);

    const promptData = await getPromptWorkspacesByWorkspaceId(wid);
    setPrompts(promptData.prompts);

    const toolData = await getToolWorkspacesByWorkspaceId(wid);
    setTools(toolData.tools);

    const modelData = await getModelWorkspacesByWorkspaceId(wid);
    setModels(modelData.models);

    // 5) базовые настройки чата по воркспейсу / query
    setChatSettings({
      model: (searchParams.get("model") ||
        workspace?.default_model ||
        "gpt-4-1106-preview") as LLMID,
      prompt: workspace?.default_prompt ?? "You are a friendly, helpful AI assistant.",
      temperature: workspace?.default_temperature ?? 0.5,
      contextLength: workspace?.default_context_length ?? 4096,
      includeProfileContext: workspace?.include_profile_context ?? true,
      includeWorkspaceInstructions: workspace?.include_workspace_instructions ?? true,
      embeddingsProvider: (workspace?.embeddings_provider as "openai" | "local") ?? "openai"
    });

    setLoading(false);
  };

  if (loading) return <Loading />;

  return <Dashboard>{children}</Dashboard>;
}
