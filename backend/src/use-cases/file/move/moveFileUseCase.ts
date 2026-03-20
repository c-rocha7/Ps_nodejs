import { File } from "../../../entities";
import { ApplicationError } from "../../../errors/applicationError";
import { FileRepository } from "../../../repositories/fileRepository";

export class MoveFileUseCase {
  constructor(private readonly fileRepository: FileRepository) {}

  public async execute(
    id: number,
    userId: number,
    folder: string | null
  ): Promise<File> {
    const file = await this.fileRepository.moveToFolder(id, userId, folder);
    if (!file) throw new ApplicationError("Arquivo não encontrado");
    return file;
  }
}
