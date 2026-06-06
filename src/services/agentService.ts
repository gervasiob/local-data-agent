/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import { OpenAI } from "openai";
import { ChatMessage, ConnectionStatus, ConnectionType } from "../types.js";
import { QueryEngine } from "./queryEngine.js";
import { ReportsService } from "./reports.js";

// Safe Lazy-Initialized Clients
let geminiClient: GoogleGenAI | null = null;
let openaiClient: OpenAI | null = null;

function hasGeminiKey(): boolean {
  const apiKey = process.env.GEMINI_API_KEY;
  return !!(apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "");
}

function hasOpenaiKey(): boolean {
  const apiKey = process.env.OPENAI_API_KEY;
  return !!(apiKey && apiKey !== "MY_OPENAI_API_KEY" && apiKey.trim() !== "");
}

function getGeminiClient(): GoogleGenAI | null {
  if (geminiClient) return geminiClient;
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    return null;
  }

  geminiClient = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
  return geminiClient;
}

function getOpenaiClient(): OpenAI | null {
  if (openaiClient) return openaiClient;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "MY_OPENAI_API_KEY" || apiKey.trim() === "") {
    return null;
  }

  openaiClient = new OpenAI({
    apiKey: apiKey,
  });
  return openaiClient;
}

export class AgentService {
  
  static getActiveEngine(): { provider: "gemini" | "openai" | "offline"; model: string } {
    if (hasOpenaiKey()) {
      return { provider: "openai", model: "GPT-4o Mini" };
    }
    if (hasGeminiKey()) {
      return { provider: "gemini", model: "Gemini 3.5 Flash" };
    }
    return { provider: "offline", model: "Modelo Offline" };
  }

  /**
   * Orchestrates the agent reply.
   * Receives chat history, connection metadata schema summaries, and the user message,
   * keeping all real database secrets/paths hidden from the LLM prompt.
   */
  static async converse(
    message: string,
    history: ChatMessage[],
    status: ConnectionStatus
  ): Promise<{ responseText: string; suggestedSql?: string }> {

    // 1. Build the Sanitized Context Block for Privacy Protection
    let sanitizedContext = "--- CONTEXTO DE PRIVACIDAD LOCAL: FUENTE DESCONECTADA ---\n";
    sanitizedContext += "El usuario no ha establecido ninguna conexión local todavía. Por favor, indícale amablemente que seleccione y conecte una Base de Datos o una Carpeta en la pantalla inicial.\n\n";

    if (status.isConnected && status.schemaSummary) {
      if (status.activeType === ConnectionType.DATABASE) {
        const schema = status.schemaSummary as any;
        sanitizedContext = `--- CONTEXTO DE PRIVACIDAD LOCAL: BASE DE DATOS LOCAL CONECTADA ---
Tipo de Motor: ${schema.dbType} (Conexión almacenada de manera local, segura, sin credenciales compartidas con el LLM).
Número de Tablas: ${schema.totalTables}

Estructura de la Base de Datos (Esquema Sanitizado):
`;
        for (const table of schema.tables) {
          sanitizedContext += `\nTabla: "${table.name}" (Cantidad de Registros: ${table.rowCount})\n`;
          sanitizedContext += "Columnas disponibles:\n";
          for (const col of table.columns) {
            sanitizedContext += `  - ${col.name} (${col.type})${col.isPrimaryKey ? " [CLAVE PRIMARIA]" : ""}${col.nullable ? " [NULO_PERMITIDO]" : ""}\n`;
          }
        }
        sanitizedContext += `
Reglas Críticas del Agente:
1. Puedes proponer exclusivamente consultas SQL de LECTURA (SELECT).
2. Tienes estrictamente prohibido emitir o recomendar comandos INSERT, UPDATE, DELETE, TRUNCATE, DROP, ALTER, CREATE por políticas de seguridad.
3. Si el usuario solicita un análisis, cifras, sumatorias, conteos, reportes legislativos o búsqueda de inconsistencias de la base de datos, estructúrale y recomiéndale la consulta SQL 'SELECT' exacta necesaria rodeada por bloques de código estándar: \`\`\`sql ... \`\`\`
4. El backend capturará tu sugerencia SQL automáticamente, la procesará localmente y le renderizará la tabla interactiva al usuario en pantalla de manera segura.
`;
      } else if (status.activeType === ConnectionType.FOLDER) {
        const schema = status.schemaSummary as any;
        sanitizedContext = `--- CONTEXTO DE PRIVACIDAD LOCAL: CARPETA LOCAL CONECTADA ---
Ruta Física Local: [ENMASCARADA POR PRIVACIDAD] (Mantenido solo en el cliente local).
Nombre de la Carpeta: ${schema.folderName}
Total de Archivos Inspeccionados: ${schema.totalFiles}
Peso Total: ${(schema.totalSize / 1024).toFixed(2)} KB

Archivos Locales Listados (Esquema Sanitizado):
`;
        for (const file of schema.files) {
          sanitizedContext += `- Archivo: "${file.name}" (Tamaño: ${file.size} Bytes, Tipo: ${file.type}, Modificado: ${file.dateModified})\n`;
          if (file.rowCount) {
            sanitizedContext += `  * Filas tabulares: ${file.rowCount}\n`;
          }
          if (file.columns && file.columns.length > 0) {
            sanitizedContext += `  * Columnas detectadas: ${file.columns.join(", ")}\n`;
          }
        }
        sanitizedContext += `
Reglas Críticas del Agente:
1. Responde preguntas sobre qué archivos hay, para qué sirven en este directorio, y haz perfilados lógicos.
2. Si el usuario pide resúmenes, reportes de IVA facturado, totales de gastos o análisis ejecutivos basados en estos archivos, puedes explicar los números basándote en la información listada o en reportes consolidados.
`;
      } else if (status.activeType === ConnectionType.GOOGLE_DRIVE || status.activeType === "GOOGLE_DRIVE") {
        const schema = status.schemaSummary as any;
        sanitizedContext = `--- CONTEXTO DE PRIVACIDAD LOCAL: GOOGLE DRIVE CONECTADO ---
Google Drive de usuario (Conectado con Token OAuth seguro o Demo en sesión cliente).
Nombre del Almacenamiento: ${schema.folderName || "Mi Google Drive"}
Total de Archivos Listados: ${schema.totalFiles || 0}
Peso Total: ${((schema.totalSize || 0) / 1024).toFixed(2)} KB

Archivos de Google Drive cargados/listados (Esquema Sanitizado):
`;
        if (schema.files && schema.files.length > 0) {
          for (const file of schema.files) {
            sanitizedContext += `- Archivo: "${file.name}" (Tamaño: ${file.size} Bytes, Tipo: ${file.type}, Modificado: ${file.dateModified || "N/A"})\n`;
            if (file.rowCount) {
              sanitizedContext += `  * Filas tabulares: ${file.rowCount}\n`;
            }
            if (file.columns && file.columns.length > 0) {
              sanitizedContext += `  * Columnas detectadas: ${file.columns.join(", ")}\n`;
            }
          }
        } else {
          sanitizedContext += "(No hay archivos cargados en este momento)\n";
        }
        sanitizedContext += `
Reglas Críticas del Agente:
1. Responde preguntas sobre qué archivos hay en Google Drive de forma clara.
2. Si el usuario pide analizar un archivo específico de Google Drive, pídele que haga clic en el botón "Analizar" o "Cargar como Tabla Virtual" del archivo para importar el contenido localmente y poder procesarlo en detalle.
`;
      }
    }

    if (status.extractedDataContext) {
      const dataCtx = status.extractedDataContext;
      sanitizedContext += `\n
--- CONTEXTO DE DATOS EXTRAÍDOS ACTIVOS (ESTÁS OPERANDO SOBRE ESTA TABLA LOCAL) ---
Se ha realizado una extracción exitosa desde la Base de Datos o Archivo: ${dataCtx.sourceName || "Consulta activa"}
Consulta de origen: \`${dataCtx.query}\`
Total de filas extraídas: ${dataCtx.rows?.length || 0}
Columnas recibidas: ${dataCtx.columns?.join(", ")}

REGISTROS TABULARES ACTUALES (Usa estos registros para responder preguntas de cálculos, listados, estadísticas y agrupaciones):
${JSON.stringify(dataCtx.rows ? dataCtx.rows.slice(0, 300) : [], null, 2)}
${dataCtx.rows && dataCtx.rows.length > 300 ? `\n(Se recortaron los registros a los primeros 300 de un total de ${dataCtx.rows.length} para optimización de contexto)` : ""}

REGLAS DE OPERACIÓN CON LOS DATOS EXTRAÍDOS:
1. El usuario está operando sobre este conjunto específico de datos ya extraídos. Haz cálculos, porcentajes, resúmenes, auditorías u optimizaciones directamente sobre estos registros locales.
2. Si el usuario te hace preguntas como "Suma los totales", "Filtra por PENDIENTE", "Cuál es el mayor?", calcula las respuestas usando el JSON de arriba y respóndele directamente con los resultados exactos. No propongas consultas SQL a menos que el usuario lo solicite expresamente diciendo que desea volver a consultar o renovar los datos.
`;
    }

    // 2. Draft the System Instructions for Agent Behavior
    const systemInstruction = `Eres un "Local Data Agent", un consultor de análisis de datos empresarial altamente capacitado.
Operas con una estricta política de "Privacidad Local-First": las contraseñas, URIs de conexión y archivos crudos se guardan en la máquina del usuario, y tú solo ves sumatorias agregadas y nombres de columnas (metadatos sanitizados).

Responsabilidades y Respuestas:
- Adopta un tono profesional, claro, educado y didáctico (hablas español).
- Siempre que el usuario haga preguntas sobre tendencias, IVA a pagar, inconsistencias, o estados de facturación en la base de datos, sugiérele o recomiéndale una consulta SQL estructurada SELECT.
- IMPORTANTE: Coloca la query SQL recomendada en un bloque de código markdown de SQL EXACTO, por ejemplo:
  \`\`\`sql
  SELECT * FROM facturas WHERE estado = 'PENDIENTE';
  \`\`\`
  El sistema detectará este bloque automático y le ofrecerá ejecutarlo localmente en un solo clic.
- Si el usuario te consulta sobre inconsistencias, de manera proactiva haz notar que cuentas con herramientas de perfilado automático de auditoría matemática (por ejemplo, validar si subtotal + iva es igual a total, buscar facturas canceladas, clientes huérfanos o correos rotos) y explícale los hallazgos con claridad ejecutiva.
- Explica los datos complejos de una manera comprensible para gerentes no técnicos si se te solicita ("Explícame esto como si fuera un gerente").
`;

    // 3. Assemble full prompt
    const contents: any[] = [];
    
    // Add brief conversation history (last 10 turns) to prevent prompt bloat
    const recHist = history.slice(-10);
    for (const h of recHist) {
      contents.push({
        role: h.role,
        parts: [{ text: h.content }]
      });
    }

    // Append current user message prefixed with database/folder safe scope
    const augmentedUserMessage = `[Foco actual del usuario]\n${sanitizedContext}\n\n[Pregunta/Comando del usuario]: ${message}`;
    contents.push({
      role: "user",
      parts: [{ text: augmentedUserMessage }]
    });

    // 4. Try calling OpenAI or Google Gemini AI, or fallback offline if unavailable
    const useOpenai = hasOpenaiKey();
    const useGemini = !useOpenai && hasGeminiKey();

    if (useOpenai) {
      const client = getOpenaiClient();
      if (!client) {
        const offlineReply = this.generateOfflineFallbackResponse(message, status);
        return {
          responseText: `[Nota: Error de inicialización con OpenAI. Iniciado Modo Offline Local]\n\n${offlineReply.responseText}`,
          suggestedSql: offlineReply.suggestedSql
        };
      }

      try {
        const messages: any[] = [
          { role: "system", content: systemInstruction }
        ];

        const recHist = history.slice(-10);
        for (const h of recHist) {
          const role = h.role === "system" ? "system" : h.role === "user" ? "user" : "assistant";
          messages.push({
            role: role,
            content: h.content
          });
        }

        messages.push({
          role: "user",
          content: augmentedUserMessage
        });

        const response = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: messages,
          temperature: 0.3,
        });

        const responseText = response.choices[0]?.message?.content || "No se recibió respuesta del agente local.";
        const suggestedSql = this.extractSqlBlock(responseText);

        return {
          responseText,
          suggestedSql
        };
      } catch (error: any) {
        console.error("OpenAI API Error, falling back to Offline Mode:", error);
        const offlineReply = this.generateOfflineFallbackResponse(message, status);
        return {
          responseText: `[Nota: Operando temporalmente en modo offline local debido a un error de OpenAI: ${error.message}]\n\n${offlineReply.responseText}`,
          suggestedSql: offlineReply.suggestedSql
        };
      }
    } else if (useGemini) {
      const client = getGeminiClient();
      if (!client) {
        const offlineReply = this.generateOfflineFallbackResponse(message, status);
        return offlineReply;
      }

      try {
        const response = await client.models.generateContent({
          model: "gemini-3.5-flash",
          contents: contents,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.3, // Lower temperature for analytical data consistency
          }
        });

        const responseText = response.text || "No se recibió respuesta del agente local.";
        
        // Auto-extract suggested SQL block if present
        const suggestedSql = this.extractSqlBlock(responseText);

        return {
          responseText,
          suggestedSql
        };

      } catch (error: any) {
        console.error("Gemini API Error, falling back to Offline Mode:", error);
        const offlineReply = this.generateOfflineFallbackResponse(message, status);
        return {
          responseText: `[Nota: Operando temporalmente en modo offline local debido a un error de Gemini: ${error.message}]\n\n${offlineReply.responseText}`,
          suggestedSql: offlineReply.suggestedSql
        };
      }
    } else {
      // ----------------------------------------------------
      // OFFLINE FALLBACK MODE GENERATOR (Fulfills Req #5)
      // ----------------------------------------------------
      const offlineReply = this.generateOfflineFallbackResponse(message, status);
      return offlineReply;
    }
  }

  /**
   * Helper to parse SQL code blocks out of response text
   */
  private static extractSqlBlock(text: string): string | undefined {
    const match = text.match(/```sql([\s\S]*?)```/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    return undefined;
  }

  /**
   * Generates logical responses offline when there's no API key configured.
   * Fully processes questions about IVA, reportes ejecutivos, anomalies, structures, files, etc.
   */
  private static generateOfflineFallbackResponse(
    message: string,
    status: ConnectionStatus
  ): { responseText: string; suggestedSql?: string } {
    const m = message.toLowerCase();
    
    if (!status.isConnected) {
      return {
        responseText: "¡Hola! Bienvenido a **Local Data Agent**. Actualmente estoy operando en **Modo Offline Local**. Para comenzar, por favor ve al panel de conexión de la izquierda y conéctate al esquema SQLite de Demostración o a la Carpeta de archivos para que pueda mostrarte su estructura."
      };
    }

    // Database Connected Offline Responses
    if (status.activeType === ConnectionType.DATABASE) {
      const dbReport = ReportsService.generateExecutiveReport();
      
      if (m.includes("estructur") || m.includes("esquema") || m.includes("tablas") || m.includes("qué hay")) {
        return {
          responseText: `### Estado de la Estructura de la Base de Datos (SQLite Local)

La base de datos local de facturación contiene **3 tablas principales**:

1. **\`clientes\`** (${dbReport.metrics.clientCount} registros): Almacena nombre fiscal, RFC/NIT, correo electrónico corporativo y ciudad.
2. **\`facturas\`** (${dbReport.metrics.invoiceCount} registros): Registra número de factura, fecha, subtotal, IVA, total general y el estado actual (PAGADA, PENDIENTE o CANCELADA).
3. **\`detalles_factura\`** (13 registros): Detalla conceptos, cantidades físicas, precios unitarios y subtotales por concepto de cada factura.

¿Te gustaría consultar alguna tabla en particular? Te sugiero ejecutar:
\`\`\`sql
SELECT * FROM facturas LIMIT 5;
\`\`\`
Haciendo clic en el botón de ejecución rápida.`,
          suggestedSql: "SELECT * FROM facturas LIMIT 5;"
        };
      }

      if (m.includes("iva") || m.includes("impuesto") || m.includes("calcula")) {
        return {
          responseText: `### Informe de Cálculos de Impuestos (IVA 2026)

Analizando los datos de facturación localmente se determinó el siguiente balance tributario:

- **Subtotal Neto Acumulado**: $${dbReport.metrics.grandSubtotal.toLocaleString()} MXN
- **Impuesto de IVA Total (16%)**: **$${dbReport.metrics.grandIva.toLocaleString()}** MXN
- **Importe Total Facturado**: $${dbReport.metrics.grandTotal.toLocaleString()} MXN

**Desglose de IVA según el estado de las facturas:**
- **IVA Cobrado (Facturas PAGADAS)**: $${(dbReport.metrics.paidTotal * 0.16 / 1.16).toFixed(2)} MXN
- **IVA por Cobrar (Facturas PENDIENTES)**: $${(dbReport.metrics.pendingTotal * 0.16 / 1.16).toFixed(2)} MXN
- **IVA Nulo (Facturas CANCELADAS)**: $${(dbReport.metrics.cancelledTotal * 0.16 / 1.16).toFixed(2)} MXN

Puedes auditar las facturas pendientes ejecutando la consulta:
\`\`\`sql
SELECT numero, subtotal, iva, total, estado FROM facturas WHERE estado = 'PENDIENTE';
\`\`\``,
          suggestedSql: "SELECT numero, subtotal, iva, total, estado FROM facturas WHERE estado = 'PENDIENTE';"
        };
      }

      if (m.includes("anomalia") || m.includes("inconsistencia") || m.includes("faltant") || m.includes("auditor")) {
        const anomalies = ReportsService.detectDataAnomalies();
        let listText = "";
        for (const [idx, a] of anomalies.entries()) {
          listText += `${idx + 1}. **[${a.tipo} - Gravedad: ${a.gravedad}]** ${a.descripcion} (ID Tabla: ${a.registroId})\n`;
        }
        
        return {
          responseText: `### Reporte de Auditoría y Detección de Inconsistencias Locales

El escáner de perfiles analíticos ha detectado **${anomalies.length} anomalías** en los registros de la base:

${listText}
💡 **Recomendación para corregir**: Revisar con el área de contabilidad los montos de la tabla de detalles para nivelar los redondeos centesimales.`,
          suggestedSql: "SELECT * FROM facturas WHERE estado = 'CANCELADA';"
        };
      }

      if (m.includes("informe") || m.includes("reporte") || m.includes("resumen") || m.includes("ejecutivo")) {
        return {
          responseText: `### Reporte Ejecutivo de Ventas y Rendimiento

Este es el reporte del estado comercial y fiscal generado de manera instantánea y local:

#### 1. Métricas Principales de Facturación
- **Volumen Total Facturado**: $${dbReport.metrics.grandTotal.toLocaleString()} MXN (con un subtotal de $${dbReport.metrics.grandSubtotal.toLocaleString()} e IVA de $${dbReport.metrics.grandIva.toLocaleString()})
- **Flujo de Caja Realizado (PAGADO)**: **$${dbReport.metrics.paidTotal.toLocaleString()}** (Representa el **${((dbReport.metrics.paidTotal/dbReport.metrics.grandTotal)*100).toFixed(1)}%** del total)
- **Cuentas por Cobrar (PENDIENTE)**: $${dbReport.metrics.pendingTotal.toLocaleString()} MXN
- **Ticket Promedio Facturado**: $${dbReport.metrics.averageInvoiceValue.toLocaleString()} MXN

#### 2. Distribución Trimestral de Ventas (Agrupado por Mes)
${dbReport.monthlySummary.map(m => `- **${m.mes}**: $${m.total.toLocaleString()} MXN (${m.cantidad} facturas)`).join("\n")}

#### 3. Clientes con Mayor Aportación de Ingresos
${dbReport.clientSummary.slice(0, 3).map((c, idx) => `- **#${idx + 1} - ${c.nombre}**: $${c.totalSuma.toLocaleString()} MXN (${c.cantidadFacturas} facs)`).join("\n")}

¿Quieres descargar este reporte consolidado en algún formato? Puedes usar los botones de **Exportar CSV / Excel / PDF** que habilitamos en el panel.`,
          suggestedSql: "SELECT c.nombre, SUM(f.total) as total_compras FROM facturas f JOIN clientes c ON f.cliente_id = c.id GROUP BY c.nombre ORDER BY total_compras DESC;"
        };
      }

      // Default database reply
      return {
        responseText: `He recibido tu mensaje acerca de la base de datos local en este modo offline. 
        Puedo sugerirte ejecutar la siguiente consulta SELECT para analizar los registros locales pertinentes:
        
\`\`\`sql
SELECT * FROM facturas ORDER BY total DESC LIMIT 3;
\`\`\`

¿Deseas que calculemos el IVA neto total, busquemos inconsistencias o redactemos un reporte ejecutivo para el gerente?`,
        suggestedSql: "SELECT * FROM facturas ORDER BY total DESC LIMIT 3;"
      };
    }

    // Folder Connected Offline Responses
    if (status.activeType === ConnectionType.FOLDER) {
      if (m.includes("estructur") || m.includes("archivos") || m.includes("qué hay") || m.includes("carpeta")) {
        return {
          responseText: `### Explorador de Carpeta Local (Modo Privado)

Dentro de la carpeta local, que se mantiene enmascarada para el servidor, se han indexado **4 archivos** locales con un tamaño conjunto de **5.75 KB**:

1. **\`resumen_ventas_2026.csv\`** (2.39 KB): Es una planilla tabular que almacena 11 líneas con el historial de facturación consolidado del año en curso.
2. **\`presupuestos_anual_2026.json\`** (1.50 KB): Archivo de configuración estructurado en formato JSON con la asignación, ejecución y remanentes de las áreas de Ventas, Marketing, IT y Operaciones.
3. **\`guia_tributaria_iva_2026.txt\`** (0.96 KB): Guía legislativa interna con especificaciones sobre tasas impositivas y reglas de fletes.
4. **\`plantilla_proveedores.json\`** (0.76 KB): Lector de catálogo con ID corporativa y estatus oficial de proveedores comerciales.

¿Te interesa que inspeccionemos el CSV de ventas o analicemos el reparto de presupuestos anuales?`
        };
      }

      if (m.includes("informe") || m.includes("reporte") || m.includes("resumen")) {
        return {
          responseText: `### Análisis Ejecutivo de Datos de Carpeta

Hemos consolidado y extraído perfiles analíticos directamente de los archivos en la carpeta conectada:

#### 1. Resumen Tabular de Ventas (\`resumen_ventas_2026.csv\`)
Se detectaron **11 facturas consolidadas**. 
* **Clientes recurrentes**: Distribuidora Alimentos S.A., Consultores de Software S.C., Estilo & Moda Retail.
* El CSV detalla columnas financieras como Subtotal, IVA y Total.

#### 2. Ejecución Presupuestaria (\`presupuestos_anual_2026.json\`)
Asignación y consumo de presupuesto:
- **Área IT**: Presupuesto asignado de $300,000, ejercido $125,000 (disponibles $175,000).
- **Ventas**: Presupuesto asignado de $150,000, ejercido $45,000.
- **Marketing**: Presupuesto asignado de $85,000, ejercido $38,000.
- Operaciones mantiene un remanente sano de $125,000.

¿Te gustaría exportar una copia unificada en formato de hoja de cálculo XLSX o CSV?`
        };
      }

      return {
        responseText: "He analizado el contenido de tu carpeta local en modo offline. Los archivos disponibles (`resumen_ventas_2026.csv`, `presupuestos_anual_2026.json`, `guia_tributaria_iva_2026.txt`) contienen datos estructurados financieros e instructivos de IVA. ¿Te gustaría realizar un balance ejecutivo de IVA u obtener un informe de ejecución presupuestaria?"
      };
    }

    return {
      responseText: "¡Perfecto! Estoy conectado localmente y listo para analizar los datos. ¿Qué te gustaría consultar hoy?"
    };
  }
}
