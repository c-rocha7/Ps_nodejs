"use client";

import { getConstants } from "@/constants";
import { makeLinkRedirect } from "@/helper/makeLinkRedirect";
import { truncateString } from "@/helper/truncateString";
import { getAllFilesService } from "@/services/getAllFilesService";
import { moveFileService } from "@/services/moveFileService";
import { uploadFiles } from "@/services/uploadFiles";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "ico", "tiff"];
const DOC_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "odt", "ods", "odp"];

const getFileType = (fileName: string): string => {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (IMAGE_EXTENSIONS.includes(ext)) return "imagem";
  if (DOC_EXTENSIONS.includes(ext)) return "documento";
  return "outros";
};

const getDisplayName = (fileName: string): string =>
  fileName?.split("_").slice(2).join("_") || fileName;

const FILE_TYPE_OPTIONS = [
  { value: "todos", label: "Todos os tipos", icon: "📁" },
  { value: "imagem", label: "Imagens", icon: "🖼️" },
  { value: "documento", label: "Documentos", icon: "📄" },
  { value: "outros", label: "Outros", icon: "📦" },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function Home() {
  const router = useRouter();
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [pendingFiles, setPendingFiles] = useState<globalThis.File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [fileTypeFilter, setFileTypeFilter] = useState("todos");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [localFolders, setLocalFolders] = useState<string[]>([]);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [movingFileId, setMovingFileId] = useState<number | null>(null);

  const showError = (message: string) => {
    setUploadError(message);
    setTimeout(() => setUploadError(null), 5000);
  };

  // Pastas derivadas dos arquivos já salvos + pastas locais ainda vazias
  const serverFolders = [
    ...new Set(uploadedFiles.map((f) => f.folder).filter(Boolean) as string[]),
  ].sort();
  const allFolders = [...new Set([...serverFolders, ...localFolders])].sort();

  const filesInCurrentFolder = uploadedFiles.filter(
    (f) => f.folder === currentFolder
  );
  const filteredFiles =
    fileTypeFilter === "todos"
      ? filesInCurrentFolder
      : filesInCurrentFolder.filter((f) =>
          getFileType(getDisplayName(f.fileName)) === fileTypeFilter
        );

  const activeOption = FILE_TYPE_OPTIONS.find((o) => o.value === fileTypeFilter);

  const handleChange = async (event) => {
    const file: globalThis.File | undefined = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      showError(`"${file.name}" excede o limite de 5MB. Escolha um arquivo menor.`);
      return;
    }

    try {
      setIsUploading(true);
      setPendingFiles([file]);

      const response = await uploadFiles(file, currentFolder);

      setUploadedFiles((prev) => [...prev, response]);
      setPendingFiles([]);
    } catch (error) {
      setPendingFiles([]);
      const message = error?.message || "";
      if (
        message.toLowerCase().includes("5mb") ||
        message.toLowerCase().includes("excede")
      ) {
        showError(`"${file.name}" excede o limite de 5MB. Escolha um arquivo menor.`);
      } else if (
        message.toLowerCase().includes("token") ||
        message.toLowerCase().includes("autoriza") ||
        message.toLowerCase().includes("not found")
      ) {
        router.push("/login");
      } else {
        showError("Falha ao enviar o arquivo. Tente novamente.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    if (!allFolders.includes(name)) {
      setLocalFolders((prev) => [...prev, name]);
    }
    setCurrentFolder(name);
    setNewFolderName("");
    setShowNewFolderInput(false);
  };

  const handleMoveFile = async (fileId: number, targetFolder: string | null) => {
    setMovingFileId(null);
    try {
      const updated = await moveFileService(fileId, targetFolder);
      setUploadedFiles((prev) =>
        prev.map((f) => (f.id === fileId ? updated : f))
      );
    } catch {
      showError("Falha ao mover o arquivo. Tente novamente.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(getConstants().LOCAL_STORAGE_TOKEN);
    router.push("/login");
  };

  useEffect(() => {
    const token = localStorage.getItem(getConstants().LOCAL_STORAGE_TOKEN);
    if (!token) {
      router.push("/login");
      return;
    }
    getAllFilesService()
      .then((response) => setUploadedFiles([...response]))
      .catch(() => router.push("/login"));
  }, [router]);

  return (
    <main className="flex h-screen flex-col bg-gray-50">
      {/* Toast de erro */}
      {uploadError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-3 bg-red-600 text-white px-5 py-3 rounded-xl shadow-lg max-w-md w-full mx-4">
          <span className="text-xl flex-shrink-0">⚠️</span>
          <p className="text-sm font-medium flex-1">{uploadError}</p>
          <button
            onClick={() => setUploadError(null)}
            className="ml-2 text-white opacity-70 hover:opacity-100 transition-opacity text-lg leading-none"
          >
            ✕
          </button>
        </div>
      )}

      {/* Overlay para fechar o menu "Mover" */}
      {movingFileId !== null && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setMovingFileId(null)}
        />
      )}

      {/* Header */}
      <header className="bg-gradient-to-r from-amber-500 to-amber-600 w-full h-16 flex items-center justify-between px-6 shadow-md flex-shrink-0">
        <h1 className="font-bold text-2xl text-white">📁 Simple Storage</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-white bg-opacity-20 px-3 py-1.5 rounded-lg">
            <span className="text-white text-lg">🗂️</span>
            <div className="flex flex-col leading-none">
              <span className="text-white text-xs font-medium opacity-80">Seus arquivos</span>
              <span className="text-white text-sm font-bold">
                {uploadedFiles.length}{" "}
                {uploadedFiles.length === 1 ? "arquivo" : "arquivos"}
              </span>
            </div>
          </div>
          <span className="text-white text-sm">Bem-vindo!</span>
          <button
            onClick={handleLogout}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar de pastas */}
        <aside className="w-56 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 overflow-y-auto">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Pastas
            </h3>
          </div>

          {/* Raiz */}
          <button
            onClick={() => setCurrentFolder(null)}
            className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${
              currentFolder === null
                ? "bg-amber-50 text-amber-700 border-r-2 border-amber-500"
                : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            <span>🏠</span>
            <span>Raiz</span>
            <span className="ml-auto text-xs text-gray-400">
              {uploadedFiles.filter((f) => !f.folder).length}
            </span>
          </button>

          {/* Lista de pastas */}
          {allFolders.map((folder) => (
            <button
              key={folder}
              onClick={() => setCurrentFolder(folder)}
              className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${
                currentFolder === folder
                  ? "bg-amber-50 text-amber-700 border-r-2 border-amber-500"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span>📁</span>
              <span className="truncate flex-1 text-left">{folder}</span>
              <span className="ml-auto text-xs text-gray-400">
                {uploadedFiles.filter((f) => f.folder === folder).length}
              </span>
            </button>
          ))}

          {/* Botão nova pasta */}
          <div className="p-3 mt-auto border-t border-gray-100">
            {showNewFolderInput ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateFolder();
                    if (e.key === "Escape") {
                      setShowNewFolderInput(false);
                      setNewFolderName("");
                    }
                  }}
                  placeholder="Nome da pasta"
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                  autoFocus
                />
                <div className="flex space-x-1">
                  <button
                    onClick={handleCreateFolder}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs py-1 rounded-md transition-colors"
                  >
                    Criar
                  </button>
                  <button
                    onClick={() => {
                      setShowNewFolderInput(false);
                      setNewFolderName("");
                    }}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs py-1 rounded-md transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewFolderInput(true)}
                className="w-full flex items-center justify-center space-x-1 text-xs text-gray-500 hover:text-amber-600 hover:bg-amber-50 py-1.5 rounded-md transition-colors"
              >
                <span>＋</span>
                <span>Nova pasta</span>
              </button>
            )}
          </div>
        </aside>

        {/* Conteúdo principal */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Breadcrumb + filtro por tipo */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <button
                onClick={() => setCurrentFolder(null)}
                className="hover:text-amber-600 transition-colors"
              >
                Raiz
              </button>
              {currentFolder && (
                <>
                  <span>/</span>
                  <span className="text-gray-800 font-semibold">
                    {currentFolder}
                  </span>
                </>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
                className="flex items-center space-x-2 bg-white border border-gray-300 hover:border-amber-400 px-4 py-2 rounded-lg shadow-sm transition-all duration-200 text-sm font-medium text-gray-700"
              >
                <span>{activeOption?.icon}</span>
                <span>{activeOption?.label}</span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                    isFilterDropdownOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {isFilterDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsFilterDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
                    {FILE_TYPE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setFileTypeFilter(option.value);
                          setIsFilterDropdownOpen(false);
                        }}
                        className={`w-full flex items-center space-x-2 px-4 py-2 text-sm text-left hover:bg-amber-50 transition-colors duration-150 ${
                          fileTypeFilter === option.value
                            ? "bg-amber-50 text-amber-600 font-semibold"
                            : "text-gray-700"
                        }`}
                      >
                        <span>{option.icon}</span>
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Grid de arquivos */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
            {/* Arquivos em upload */}
            {pendingFiles.map((file) => (
              <div
                key={file.name}
                className="bg-white border-2 border-blue-300 rounded-lg p-4 flex flex-col items-center justify-center h-40 shadow-sm animate-pulse"
              >
                <div className="text-blue-500 text-3xl mb-2">⏳</div>
                <p className="text-sm text-center text-gray-600 mb-2">
                  {truncateString(file.name, 20)}
                </p>
                <p className="text-xs text-blue-500">Carregando...</p>
              </div>
            ))}

            {/* Arquivos existentes */}
            {filteredFiles.map((file) => (
              <div
                key={file.fileName}
                className="relative bg-white border-2 border-green-300 hover:border-green-400 rounded-lg p-4 flex flex-col items-center justify-center h-40 shadow-sm hover:shadow-md transition-all duration-200 group"
              >
                <div
                  className="flex flex-col items-center justify-center flex-1 w-full cursor-pointer"
                  onClick={() =>
                    window.open(makeLinkRedirect(file.fileName), "_blank")
                  }
                >
                  <div className="text-green-500 text-3xl mb-2 group-hover:scale-110 transition-transform duration-200">
                    📄
                  </div>
                  <p className="text-sm text-center text-gray-700 font-medium">
                    {truncateString(getDisplayName(file.fileName), 20)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Clique para abrir
                  </p>
                </div>

                {/* Botão mover */}
                <div className="absolute top-2 right-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMovingFileId(
                        movingFileId === file.id ? null : file.id
                      );
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-gray-200 rounded-md px-1.5 py-0.5 text-xs text-gray-500 hover:text-amber-600 hover:border-amber-300 shadow-sm"
                  >
                    Mover
                  </button>

                  {movingFileId === file.id && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                      <p className="text-xs text-gray-400 px-3 py-2 border-b">
                        Mover para:
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveFile(file.id, null);
                        }}
                        className={`w-full flex items-center space-x-2 px-3 py-2 text-xs text-left hover:bg-amber-50 transition-colors ${
                          file.folder === null
                            ? "text-amber-600 font-semibold"
                            : "text-gray-700"
                        }`}
                      >
                        <span>🏠</span>
                        <span>Raiz</span>
                      </button>
                      {allFolders.map((folder) => (
                        <button
                          key={folder}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveFile(file.id, folder);
                          }}
                          className={`w-full flex items-center space-x-2 px-3 py-2 text-xs text-left hover:bg-amber-50 transition-colors ${
                            file.folder === folder
                              ? "text-amber-600 font-semibold"
                              : "text-gray-700"
                          }`}
                        >
                          <span>📁</span>
                          <span className="truncate">{folder}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Área de upload */}
            <div className="bg-white border-2 border-dashed border-amber-400 hover:border-amber-500 rounded-lg p-4 flex flex-col items-center justify-center h-40 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:bg-amber-50 group">
              <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                {isUploading ? (
                  <>
                    <div className="text-amber-500 text-3xl mb-2 animate-spin">
                      ⚙️
                    </div>
                    <p className="text-sm text-center text-amber-600 font-medium">
                      Enviando arquivo...
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-amber-500 text-3xl mb-2 group-hover:scale-110 transition-transform duration-200">
                      📤
                    </div>
                    <p className="text-sm text-center text-gray-600 font-medium mb-1">
                      Adicionar arquivo
                    </p>
                    <p className="text-xs text-center text-gray-500">
                      Clique para selecionar
                    </p>
                    <p className="text-xs text-center text-gray-400 mt-1">
                      Máximo 5MB
                    </p>
                  </>
                )}
                <input
                  type="file"
                  name="file"
                  className="hidden"
                  onChange={handleChange}
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>

          {/* Estado vazio */}
          {filesInCurrentFolder.length === 0 && pendingFiles.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl text-gray-300 mb-4">📁</div>
              <p className="text-xl text-gray-500 mb-2">
                {currentFolder
                  ? `Pasta "${currentFolder}" está vazia`
                  : "Nenhum arquivo na raiz"}
              </p>
              <p className="text-gray-400">
                Faça upload de um arquivo para começar!
              </p>
            </div>
          )}

          {filesInCurrentFolder.length > 0 && filteredFiles.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl text-gray-300 mb-4">
                {activeOption?.icon}
              </div>
              <p className="text-xl text-gray-500 mb-2">
                Nenhum arquivo do tipo &quot;{activeOption?.label?.toLowerCase()}&quot; nesta
                pasta
              </p>
              <p className="text-gray-400">
                Tente selecionar outro tipo de filtro.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

