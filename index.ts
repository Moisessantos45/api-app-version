import express from "express";
import { config } from "dotenv";
import apiClient from "./config";
import cors from "cors";
import { rateLimit } from "express-rate-limit";

config();

const server = express();

const PORT = process.env.PORT || 4000;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

server.use(limiter);

server.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

server.use(express.json());

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

    if (compareVersions(appFind.name, query.toString().toLowerCase())) {
      throw new Error("No hay nueva versión disponible");
    }

    const { data, error } = await apiClient.storage
      .from("apps")
      .download("Portafolio/" + appFind.name);

    if (error && !data) {
      throw new Error("No se pudo obtener el archivo APK");
    }

    const codeVersion =
      appFind.name.split("-").pop()?.toString().replace(".apk", "") ?? "0";

    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=" + appFind.name
    );
    res.setHeader("Content-Length", data.size);
    res.setHeader("X-App-Name", appFind.name);
    res.setHeader("X-Code-Version", codeVersion);

    const buffer = await data.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";

    res.status(500).json({
      error: true,
      message: message,
      data: null,
    });
  }
});

const compareVersions = (
  currentVersion: string,
  newVersion: string
): boolean => {
  const current = currentVersion.replace(".apk", "").split("-").pop() ?? "0";
  const new_version = newVersion.split("-").pop() ?? "0";

  return current === new_version;
};

server.get("/v1/api/app/version-check", async (req, res) => {
  try {
    const query = req.query.app ?? "0";
    if (query === "0") {
      throw new Error("No se ha encontrado la aplicación solicitada");
    }
    const appName = query.toString().toLowerCase().split("-").shift() ?? "0";

    const appFind = await findApp(appName);

    if (compareVersions(appFind.name, query.toString().toLowerCase())) {
      throw new Error("No hay nueva versión disponible");
    }

    const codeVersion =
      appFind.name.split("-").pop()?.toString().replace(".apk", "") ?? "0";

    res.status(200).json({
      error: false,
      message: "Versión de la aplicación verificada correctamente",
      data: {
        appName: appFind.name,
        codeVersion: codeVersion,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
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
