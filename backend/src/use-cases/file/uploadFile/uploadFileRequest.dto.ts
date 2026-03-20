export class UploadFileRequestDto {
  fileName: string;
  userId: number;
  folder?: string | null;
}
