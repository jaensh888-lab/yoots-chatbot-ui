"use client";

import { ReactNode, useContext, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { Dashboard } from "@/components/ui/dashboard";
import Loading from "../loading";

import { ChatbotUIContext } from "@/context/context";

import { getWorkspaceById } from "@/db/workspaces";
import { getAssistantWorkspacesByWorkspaceId } from "@/db/assistants";
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

interface WorkspaceLayoutProps {
  children: ReactNode;
}

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

  // Пускаем только авторизованных
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

  // Смена воркспейса → сброс UI и загрузка новых данных
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

    // 2) Связки ассистентов (минимум id + image_path)
    const assistantLinks = await getAssistantWorkspacesByWorkspaceId(wid);
    const assistants = (assistantLinks?.assistants ?? []) as Array<{
      id: string;
      image_path?: string | null;
    }>;
    setAssistants(assistants as any);

    // 3) Картинки ассистентов: всегда формируем МАССИВ
    type AssistantImagesParam = Parameters<typeof setAssistantImages>[0];
    const images = [] as unknown as AssistantImagesParam;

    for (const a of assistants) {
      if (!a.image_path) continue;

      try {
        const res = await getAssistantImageFromStorage(a.image_path);

        let blob: Blob | null = null;
        if (res instanceof Blob) {
          blob = res;
        } else if (typeof res === "string") {
          // если вернулся URL — докачаем Blob вручную
          const r = await fetch(res);
          if (r.ok) blob = await r.blob();
        } else {
          // если провайдер отдал что-то иное — попробуем через Supabase Storage напрямую
          const { data } = await supabase.storage.from("assistant-images").download(a.image_path);
          if (data) blob = data; // download() даёт Blob :contentReference[oaicite:1]{index=1}
        }

        if (blob) {
          const base64 = await convertBlobToBase64(blob); // FileReader → dataURL :contentReference[oaicite:2]{index=2}
          // не знаем точную форму AssistantImage — аккуратно кладём универсально
          // @ts-expect-error: приводим к ожидаемому типу из контекста
          images.push({ assistantId: a.id, base64 });
        }
      } catch {
        // проглатываем ошибку конкретной аватарки
      }
    }

    setAssistantImages(images);

    // 4) Остальные сущности
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

    // 5) Настройки чата (дефолты безопасные)
    setChatSettings({
      model: (searchParams.get("model") ||
        workspace?.default_model ||
        "gpt-4-1106-preview") as LLMID,
      prompt: workspace?.default_prompt ?? "You are a friendly, helpful AI assistant.",
      temperature: workspace?.default_temperature ?? 0.5,
      contextLength: workspace?.default_context_length ?? 4096,
      includeProfileContext: workspace?.include_profile_context ?? true,
      includeWorkspaceInstructions:
        workspace?.include_workspace_instructions ?? true,
      embeddingsProvider:
        (workspace?.embeddings_provider as "openai" | "local") ?? "openai",
    });

    setLoading(false);
  };

  if (loading) return <Loading />;

  return <Dashboard>{children}</Dashboard>;
}
