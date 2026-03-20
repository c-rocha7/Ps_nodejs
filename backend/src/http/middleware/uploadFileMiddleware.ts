import md5 from "md5";
import multer from "multer";
import { Request, Response } from "express";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

class UploadFileMiddleware {
  public execute() {
    const storage = this.createStorage();
    const upload = multer({ storage, limits: { fileSize: MAX_FILE_SIZE } });

    return (req: Request, res: Response, next) => {
      upload.single("file")(req, res, (err) => {
        if (err) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res
              .status(413)
              .json({ message: "O arquivo excede o limite de 5MB" });
          }
          return res.status(500).json({ message: "Erro ao processar upload" });
        }
        next();
      });
    };
  }

  private createStorage() {
    return multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, "./uploads");
      },
      filename: function (req, file, cb) {
        const timestamp = Date.now();
        const userHash = md5(`${req.headers.user}`);
        const fileName = `${timestamp}_${userHash}_${file.originalname}`;

        req.headers.fileName = fileName;
        cb(null, fileName);
      },
    });
  }
}

export const uploadFileMiddleware = new UploadFileMiddleware();
