import "reflect-metadata";
import { server } from "./http";
import { database } from "./database/database";

database
  .init()
  .then(() => {
    server.run(3001);
    console.log("Server running on port 3001");
  })
  .catch((error) => {
    console.error("Failed to connect to database:", error);
    process.exit(1);
  });
