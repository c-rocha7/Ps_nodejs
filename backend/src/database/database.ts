import { AppDataSource } from "./appDataSource";

class DataBase {
  public async init() {
    await AppDataSource.initialize();
  }
}

export const database = new DataBase();
