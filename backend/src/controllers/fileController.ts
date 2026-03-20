import { Request, Response } from "express";
import { UploadFileUseCase } from "../use-cases/file/uploadFile/uploadFileUseCase";
import { FileRepository } from "../repositories/fileRepository";
import { RetriveFileUseCase } from "../use-cases/file/retrive/retriveFilesUseCase";
import { MoveFileUseCase } from "../use-cases/file/move/moveFileUseCase";

class FileController {
  constructor(
    private readonly uploadFileUseCase: UploadFileUseCase,
    private readonly retriveFileUseCase: RetriveFileUseCase,
    private readonly moveFileUseCase: MoveFileUseCase
  ) {}

  public async upload(req: Request, res: Response) {
    try {
      const response = await this.uploadFileUseCase.execute({
        fileName: req.headers.fileName as string,
        userId: Number(req.headers.user),
        folder: req.body.folder || null,
      });

      res.status(200).send({ file: response });
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  }

  public async list(req: Request, res: Response) {
    const response = await this.retriveFileUseCase.execute(
      Number(req.headers.user)
    );

    res.status(200).send({ files: response });
  }

  public async move(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const userId = Number(req.headers.user);
      const folder: string | null = req.body.folder ?? null;

      const file = await this.moveFileUseCase.execute(id, userId, folder);
      res.status(200).send({ file });
    } catch (error) {
      res.status(404).send({ message: error.message });
    }
  }
}

export const fileController = new FileController(
  new UploadFileUseCase(new FileRepository()),
  new RetriveFileUseCase(new FileRepository()),
  new MoveFileUseCase(new FileRepository())
);
