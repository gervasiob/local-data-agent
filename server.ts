/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import XLSX from "xlsx";

import { ConnectorsService } from "./src/services/connectors.js";
import { QueryEngine } from "./src/services/queryEngine.js";
import { ReportsService } from "./src/services/reports.js";
import { AgentService } from "./src/services/agentService.js";
import { ConnectionType, ChatMessage, ConnectionStatus } from "./src/types.js";

// Ensure downloads folder exists
const DOWNLOADS_DIR = path.join(process.cwd(), "downloads");
if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR);
}

// Global state for active local connection (simulating local-desktop daemon)
let activeConnectionId: string | null = null;
let activeConnectionType: ConnectionType | null = null;
let activeConnectionName: string | null = null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // 1. API ROUTES

  // Get current connection state
  app.get("/api/status", (req, res) => {
    const engine = AgentService.getActiveEngine();

    if (!activeConnectionId || !activeConnectionType) {
      return res.json({
        isConnected: false,
        activeId: null,
        activeType: null,
        activeName: null,
        schemaSummary: null,
        aiProvider: engine.provider,
        aiModel: engine.model
      } as ConnectionStatus);
    }

    let schemaSummary: any = null;
    if (activeConnectionType === ConnectionType.DATABASE) {
      schemaSummary = ConnectorsService.getDbSchema(activeConnectionId);
    } else {
      schemaSummary = ConnectorsService.getFolderSchema(activeConnectionId);
    }

    res.json({
      isConnected: schemaSummary !== null,
      activeId: activeConnectionId,
      activeType: activeConnectionType,
      activeName: activeConnectionName,
      schemaSummary,
      aiProvider: engine.provider,
      aiModel: engine.model
    } as ConnectionStatus);
  });

  // Get list of stored connections (sanitized)
  app.get("/api/connections", (req, res) => {
    res.json(ConnectorsService.getConnections());
  });

  // Connect / Save form parameters
  app.post("/api/connect", (req, res) => {
    const { type, name, dbMotor, uri, host, port, user, password, database, folderPath } = req.body;

    if (!type || !name) {
      return res.status(400).json({ error: "Nombre y tipo de conexión requeridos." });
    }

    try {
      if (type === ConnectionType.DATABASE) {
        if (!dbMotor) {
          return res.status(400).json({ error: "Tipo de motor requerido para bases de datos." });
        }
        
        // Save database configuration (secrets gets stored securely on connectors maps)
        const saved = ConnectorsService.saveDbConnection({
          name,
          motor: dbMotor,
          uri,
          host,
          port,
          user,
          password,
          database
        });

        activeConnectionId = saved.id;
        activeConnectionType = ConnectionType.DATABASE;
        activeConnectionName = saved.name;

        const schema = ConnectorsService.getDbSchema(saved.id);
        return res.json({
          status: "connected",
          connection: { id: saved.id, name: saved.name, type: ConnectionType.DATABASE },
          schema
        });
      } else {
        if (!folderPath) {
          return res.status(400).json({ error: "La ruta de carpeta local es requerida." });
        }

        const saved = ConnectorsService.saveFolderConnection({
          name,
          folderPath
        });

        activeConnectionId = saved.id;
        activeConnectionType = ConnectionType.FOLDER;
        activeConnectionName = saved.name;

        const schema = ConnectorsService.getFolderSchema(saved.id);
        return res.json({
          status: "connected",
          connection: { id: saved.id, name: saved.name, type: ConnectionType.FOLDER },
          schema
        });
      }
    } catch (e: any) {
      res.status(500).json({ error: `Error conectando localmente: ${e.message}` });
    }
  });

  // Quick endpoint to test connection (credentials remain local, simulated output)
  app.post("/api/connect/test", (req, res) => {
    const { type, dbMotor, pathOrUri } = req.body;
    
    // Simulate latency of local diagnostics
    setTimeout(() => {
      if (type === ConnectionType.DATABASE) {
        res.json({ success: true, message: "¡Prueba de conexión exitosa! Acceso verificado de lectura/escritura local SQLite." });
      } else {
        res.json({ success: true, message: "¡Prueba de carpeta exitosa! Se encontraron 4 archivos estructurados en la ruta local." });
      }
    }, 600);
  });

  // Disconnect source
  app.delete("/api/connect", (req, res) => {
    activeConnectionId = null;
    activeConnectionType = null;
    activeConnectionName = null;
    res.json({ success: true, message: "Fuente desconectada exitosamente." });
  });

  // Chat message endpoint using conversational AI agents (sanitized prompts)
  app.post("/api/chat", async (req, res) => {
    const { message, history, statusOverride } = req.body;

    if (!message) {
      return res.status(400).json({ error: "No se proporcionó ningún mensaje." });
    }

    try {
      // Re-fetch clean system status and sanitized statistics metadata or use statusOverride
      let status: ConnectionStatus = statusOverride || {
        isConnected: false,
        activeId: null,
        activeType: null,
        activeName: null,
        schemaSummary: null
      };

      if (!statusOverride && activeConnectionId && activeConnectionType) {
        const schemaSummary = activeConnectionType === ConnectionType.DATABASE
          ? ConnectorsService.getDbSchema(activeConnectionId)
          : ConnectorsService.getFolderSchema(activeConnectionId);

        status = {
          isConnected: schemaSummary !== null,
          activeId: activeConnectionId,
          activeType: activeConnectionType,
          activeName: activeConnectionName,
          schemaSummary
        };
      }

      const agentResult = await AgentService.converse(message, history || [], status);
      res.json(agentResult);

    } catch (e: any) {
      res.status(500).json({ error: `Fallo del agente: ${e.message}` });
    }
  });

  // Local SQL Execution (read-only queries mapped entirely locally)
  app.post("/api/query/execute", (req, res) => {
    const { sql } = req.body;
    if (!sql) {
      return res.status(400).json({ error: "Consulta SQL vacía." });
    }

    const result = QueryEngine.executeSql(sql);
    res.json(result);
  });

  // File system content reader (virtual preview, local-only safety)
  app.get("/api/folder/preview/:filename", (req, res) => {
    const filename = req.params.filename;
    // Look up in VIRTUAL_FOLDER_FILES
    const { VIRTUAL_FOLDER_FILES } = require("./src/data/mockData.js");
    const file = VIRTUAL_FOLDER_FILES.find((f: any) => f.name === filename);
    if (!file) {
      return res.status(404).json({ error: "Archivo local no encontrado." });
    }
    res.json({ filename: file.name, content: file.content });
  });

  // Advanced data profiling anomalies endpoint
  app.get("/api/profile/anomalies", (req, res) => {
    const anomalies = ReportsService.detectDataAnomalies();
    res.json({ anomalies, count: anomalies.length });
  });

  // Export Results endpoint (renders CSV / XLSX directly as attachments)
  app.post("/api/export", (req, res) => {
    const { format, type, sql, filename } = req.body;
    
    let columns: string[] = [];
    let rows: any[] = [];
    let fileTitle = filename || "export_local_data";

    if (type === "database") {
      // Execute the SQL to gather final dataset to export
      const queryResult = QueryEngine.executeSql(sql || "SELECT * FROM facturas;");
      if (queryResult.error) {
        return res.status(400).json({ error: `Imposible exportar: ${queryResult.error}` });
      }
      columns = queryResult.columns;
      rows = queryResult.rows;
    } else {
      // Folder CSV export: return standard virtual records representation
      const { VIRTUAL_FOLDER_FILES } = require("./src/data/mockData.js");
      const csvFile = VIRTUAL_FOLDER_FILES.find((f: any) => f.type === "csv");
      if (csvFile) {
        // Parse CSV to json rows
        const lines = csvFile.content.split("\n");
        columns = lines[0].split(",");
        rows = lines.slice(1).filter((l: string) => l.trim().length > 0).map((line: string) => {
          const vals = line.split(",");
          const record: any = {};
          columns.forEach((col, idx) => {
            record[col] = vals[idx];
          });
          return record;
        });
      }
    }

    if (format === "csv") {
      // Create CSV output string
      let csvContent = columns.join(",") + "\n";
      for (const row of rows) {
        const line = columns.map(col => {
          const val = row[col] === undefined ? "" : row[col];
          // Wrap string standard containing commas
          if (typeof val === "string" && val.includes(",")) {
            return `"${val}"`;
          }
          return val;
        }).join(",");
        csvContent += line + "\n";
      }

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=${fileTitle}.csv`);
      return res.send(csvContent);

    } else if (format === "xlsx" || format === "excel") {
      // Create Sheet workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Datos Locales");
      
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=${fileTitle}.xlsx`);
      return res.send(buffer);

    } else if (format === "pdf") {
      // Simulated PDF generator - writes elegant styled HTML view that clients can invoke print on.
      // We return custom styled text sheet representing reports summary
      let pdfLayout = `--- DOCUMENTO DETALLADO DE EXPORTACIÓN (LOCAL DATA AGENT) ---\n`;
      pdfLayout += `Generado el: ${new Date().toLocaleDateString()}\n`;
      pdfLayout += `Título: ${fileTitle.toUpperCase()}\n`;
      pdfLayout += `Origen: ${activeConnectionName || "Origen Local"}\n`;
      pdfLayout += `Registros Totales: ${rows.length}\n`;
      pdfLayout += `========================================================================\n\n`;

      // Table Header
      pdfLayout += columns.map(c => c.toUpperCase().padEnd(16)).join(" | ") + "\n";
      pdfLayout += "-".repeat(columns.length * 19) + "\n";

      // Rows
      for (const r of rows) {
        pdfLayout += columns.map(col => String(r[col] || "").padEnd(16)).join(" | ") + "\n";
      }

      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Content-Disposition", `attachment; filename=${fileTitle}.txt`);
      return res.send(pdfLayout);
    }

    res.status(400).json({ error: "Formato de exportación no soportado." });
  });

  // 2. STAGE/SERVE VITE STATIC / MIDDLEWARE
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Local Data Agent server running on http://localhost:${PORT}`);
  });
}

startServer();
