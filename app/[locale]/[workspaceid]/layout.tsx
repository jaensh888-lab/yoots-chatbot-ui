"use client";

import { Dashboard } from "@/components/ui/dashboard";
import { ChatbotUIContext } from "@/context/context";
import { getAssistantWorkspacesByWorkspaceId } from "@/db/assistants";
import { getChatsByWorkspaceId } from "@/db/chats";
import { getCollectionWorkspacesByWorkspaceId } from "@/db/collections";
import { getFileWorkspacesByWorkspaceId } from "@/db/files";
import { getFoldersByWorkspaceId } from "@/db/folders";
import { getModelWorkspacesByWorkspaceId } from "@/db/models";
import { getPresetWorkspacesByWorkspaceId } from "@/db/presets";
import { getPromptWorkspacesByWorkspaceId } from "@/db/prompts";
import { getAssistantImageFromStorage } from "@/db/storage/assistant-images";
import { getToolWorkspacesByWorkspaceId } from "@/db/tools";
import { getWorkspaceById } from "@/db/workspaces";
import { convertBlobToBase64 } from "@/lib/blob-to-b64";

// ВАЖНО: единый импорт Supabase по алиасу "@/supabase/*"
import { supabase } from "@/supabase/browser-client";

import type { LLMID } from "@/types";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ReactNode, useContext, useEffect, useState } from "react";
import Loading from "../loading";

interface WorkspaceLayoutProps {
  children: ReactNode;
}

/** Минимальный тип, который нам нужен из воркспейса,
 * чтобы не получить never при обращении к полям.
 */
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

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const router = useRouter();

  const params = useParams();
  const searchParams = useSearchParams();
  const workspaceId = params.workspaceid as string;

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
  } = useContext(ChatbotUIContext);

  const [loading, setLoading] = useState(true);

  // Проверка сессии — пускаем только авторизованных в рабочие пространства
  useEffect(() => {
    (async () => {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) {
        router.push("/login");
        return;
      }
      await fetchWorkspaceData(workspaceId);
    })();
    // router и workspaceId — стабильны в рамках страницы; зависимостей не добавляю,
    // чтобы не триггерить повторные вызовы.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Переключение воркспейса — сбрасываем состояние чата и подгружаем данные
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
  }, [workspaceId]); // тут зависимость корректная

  const fetchWorkspaceData = async (wid: string) => {
    setLoading(true);

    // Явно приводим результат к минимальному типу, чтобы TS не вывел never
    const workspace = (await getWorkspaceById(wid)) as WorkspaceLike | null;
    setSelectedWorkspace(workspace as any);

    const assistantData = await getAssistantWorkspacesByWorkspaceId(wid);
    const assistants = (assistantData?.assistants ?? []) as Array<{
      id: string;
      image_path?: string | null;
    }>;
    setAssistants(assistants);

    // подгружаем картинки ассистентов
    for (const assistant of assistants) {
      let url = "";

      if (assistant.image_path) {
        url = (await getAssistantImageFromStorage(assistant.image_path)) || "";
      }

      if (url) {
        const response = await fetch(url);
        const blob = await response.blob();
        const base64 = await convertBlobToBase64(blob);

        setAssistantImages(prev => [
          ...prev,
          {
            assistantId: assistant.id,
            path: assistant.image_path,
            base64,
            url
          }
        ]);
      } else {
        setAssistantImages(prev => [
          ...prev,
          {
            assistantId: assistant.id,
            path: assistant.image_path,
            base64: "",
            url
          }
        ]);
      }
    }

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

    // Настройки чата — безопасно читаем поля воркспейса с дефолтами
    setChatSettings({
      model: (searchParams.get("model") ||
        workspace?.default_model ||
        "gpt-4-1106-preview") as LLMID,
      prompt:
        workspace?.default_prompt ??
        "You are a friendly, helpful AI assistant.",
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
