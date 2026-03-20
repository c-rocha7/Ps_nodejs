"use client";

import { getConstants } from "@/constants";
import { makeLinkRedirect } from "@/helper/makeLinkRedirect";
import { truncateString } from "@/helper/truncateString";
import { getAllFilesService } from "@/services/getAllFilesService";
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

const FILE_TYPE_OPTIONS = [
  { value: "todos", label: "Todos os tipos", icon: "📁" },
  { value: "imagem", label: "Imagens", icon: "🖼️" },
  { value: "documento", label: "Documentos", icon: "📄" },
  { value: "outros", label: "Outros", icon: "📦" },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function Home() {
  const router = useRouter();
  const [files, setFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [userName, setUserName] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState("todos");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const showError = (message: string) => {
    setUploadError(message);
    setTimeout(() => setUploadError(null), 5000);
  };

  const handleChange = async (event) => {
    // Captura o File ANTES de limpar o input para evitar que a FileList
    // seja zerada em navegadores que tratam files como referência live
    const file: File | undefined = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      showError(`"${file.name}" excede o limite de 5MB. Escolha um arquivo menor.`);
      return;
    }

    try {
      setIsUploading(true);
      setFiles([file]);

      const response = await uploadFiles(file);

      setUploadedFiles((prev) => [...prev, response]);
      setFiles([]);
    } catch (error) {
      setFiles([]);
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
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem(getConstants().LOCAL_STORAGE_TOKEN);
    if (!token) {
      router.push("/login");
      return;
    }
    
    getAllFilesService()
      .then((response) => {
        setUploadedFiles([...response]);
      })
      .catch((error) => {
        console.error("Failed to load files:", error);
        router.push("/login");
      });
  }, [router]);

  const filteredFiles = fileTypeFilter === "todos"
    ? uploadedFiles
    : uploadedFiles.filter((file: any) => {
        const displayName = file.fileName?.split("_")[2] || file.fileName || "";
        return getFileType(displayName) === fileTypeFilter;
      });

  const activeOption = FILE_TYPE_OPTIONS.find((o) => o.value === fileTypeFilter);

  return (
    <main className="flex h-screen flex-col bg-gray-50">
      {/* Toast de erro de upload */}
      {uploadError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-3 bg-red-600 text-white px-5 py-3 rounded-xl shadow-lg max-w-md w-full mx-4 animate-fade-in">
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

      {/* Header */}
      <header className="bg-gradient-to-r from-amber-500 to-amber-600 w-full h-16 flex items-center justify-between px-6 shadow-md">
        <div className="flex items-center">
          <h1 className="font-bold text-2xl text-white">📁 Simple Storage</h1>
        </div>
        <div className="flex items-center space-x-4">
          {/* Contador de arquivos */}
          <div className="flex items-center space-x-2 bg-white bg-opacity-20 px-3 py-1.5 rounded-lg">
            <span className="text-white text-lg">🗂️</span>
            <div className="flex flex-col leading-none">
              <span className="text-white text-xs font-medium opacity-80">Seus arquivos</span>
              <span className="text-white text-sm font-bold">
                {uploadedFiles.length} {uploadedFiles.length === 1 ? "arquivo" : "arquivos"}
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

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Meus Arquivos</h2>

            {/* Dropdown de filtro por tipo */}
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
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
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
            {/* Upload em progresso */}
            {files.map((file) => (
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

            {/* Arquivos carregados */}
            {filteredFiles.map((file) => (
              <div
                key={file.fileName}
                onClick={() =>
                  window.open(makeLinkRedirect(file.fileName), "_blank")
                }
                className="bg-white border-2 border-green-300 hover:border-green-400 rounded-lg p-4 flex flex-col items-center justify-center h-40 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group"
              >
                <div className="text-green-500 text-3xl mb-2 group-hover:scale-110 transition-transform duration-200">📄</div>
                <p className="text-sm text-center text-gray-700 font-medium">
                  {truncateString(file.fileName?.split("_")[2] || file.fileName, 20)}
                </p>
                <p className="text-xs text-green-600 mt-1">Clique para abrir</p>
              </div>
            ))}

            {/* Área de upload */}
            <div className="bg-white border-2 border-dashed border-amber-400 hover:border-amber-500 rounded-lg p-4 flex flex-col items-center justify-center h-40 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:bg-amber-50 group">
              <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                {isUploading ? (
                  <>
                    <div className="text-amber-500 text-3xl mb-2 animate-spin">⚙️</div>
                    <p className="text-sm text-center text-amber-600 font-medium">
                      Enviando arquivo...
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-amber-500 text-3xl mb-2 group-hover:scale-110 transition-transform duration-200">📤</div>
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
          
          {uploadedFiles.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl text-gray-300 mb-4">📁</div>
              <p className="text-xl text-gray-500 mb-2">Nenhum arquivo encontrado</p>
              <p className="text-gray-400">Comece fazendo upload do seu primeiro arquivo!</p>
            </div>
          )}

          {uploadedFiles.length > 0 && filteredFiles.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl text-gray-300 mb-4">{activeOption?.icon}</div>
              <p className="text-xl text-gray-500 mb-2">Nenhum arquivo do tipo "{activeOption?.label?.toLowerCase()}" encontrado</p>
              <p className="text-gray-400">Tente selecionar outro tipo de filtro.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
