import express from "express";
import { config } from "dotenv";
import apiClient from "./comfig";
import cors from "cors";

config();

const server = express();

const PORT = process.env.PORT || 4000;

server.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

server.get("/", (_, res) => {
  res.send("Hello World");
});

const findApp = async (appName: string) => {
  const { data: app, error: errorFind } = await apiClient.storage
    .from("apps")
    .list("Portafolio");

  if (errorFind) {
    throw new Error("No se ha encontrado la aplicación solicitada");
  }

  const appFind = app.find((item) => item.name.includes(appName.toLowerCase()));
  if (!appFind?.id) {
    throw new Error("No se ha encontrado la aplicación solicitada");
  }
  return appFind;
};

server.post("/v1/api/app", async (req, res) => {
  try {
    const query = req.query.app ?? "0";
    if (query === "0") {
      throw new Error(" No se ha encontrado la aplicación solicitada");
    }
    const appName = query.toString().toLowerCase().split("-").shift() ?? "0";

    const appFind = await findApp(appName);

    if (appFind.name === `${query.toString().toLowerCase()}.apk`) {
      throw new Error("No hay nueva versión disponible");
    }

    const { data, error } = await apiClient.storage
      .from("apps")
      .download("Portafolio/" + appFind.name);

    if (error && !data) {
      throw new Error("No se pudo obtener el archivo APK");
    }

    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=" + appFind.name
    );
    res.setHeader("Content-Length", data.size);
    res.setHeader("X-App-Name", appFind.name);

    const buffer = await data.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    console.error(message);
    res.status(500).json({
      error: true,
      message: message,
      data: null,
    });
  }
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
