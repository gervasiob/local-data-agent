/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  DbConnection, 
  FolderConnection, 
  ConnectionType, 
  DbSchemaSummary, 
  FolderSchemaSummary, 
  TableSchema 
} from "../types.js";
import { 
  CLIENTES, 
  FACTURAS, 
  DETALLES_FACTURA, 
  VIRTUAL_FOLDER_FILES 
} from "../data/mockData.js";

// Safe Config Stores (In-memory representation on server)
const dbConnectionsStore = new Map<string, DbConnection>();
const folderConnectionsStore = new Map<string, FolderConnection>();

// Add a default demo sqlite connection
const DEMO_DB_ID = "sqlite-demo-facturas";
dbConnectionsStore.set(DEMO_DB_ID, {
  id: DEMO_DB_ID,
  name: "Local SQLite Facturacion (Demo)",
  motor: "SQLite" as any,
  uri: "sqlite://local_facturas.db",
  createdAt: new Date().toISOString()
});

// Add a default folder connection
const DEMO_FOLDER_ID = "folder-demo-archivos";
folderConnectionsStore.set(DEMO_FOLDER_ID, {
  id: DEMO_FOLDER_ID,
  name: "Carpeta Facturas y Reportes CSV/JSON (Demo)",
  folderPath: "/usr/local/data/facturas_import",
  createdAt: new Date().toISOString()
});

export class ConnectorsService {
  
  static getConnections() {
    // Redact all secrets before listing connections
    const dbs = Array.from(dbConnectionsStore.values()).map(conn => ({
      id: conn.id,
      name: conn.name,
      motor: conn.motor,
      createdAt: conn.createdAt,
      // Redacted properties
      host: conn.host ? "●●●●●●●●" : undefined,
      user: conn.user ? "●●●●●●●●" : undefined,
      uri: conn.uri ? this.maskUri(conn.uri) : undefined
    }));

    const folders = Array.from(folderConnectionsStore.values()).map(f => ({
      id: f.id,
      name: f.name,
      createdAt: f.createdAt,
      folderPath: this.maskPath(f.folderPath)
    }));

    return { dbs, folders };
  }

  static saveDbConnection(conn: Omit<DbConnection, "id" | "createdAt">): DbConnection {
    const id = `db-${Date.now()}`;
    const newConn: DbConnection = {
      ...conn,
      id,
      createdAt: new Date().toISOString()
    };
    dbConnectionsStore.set(id, newConn);
    return newConn;
  }

  static saveFolderConnection(conn: Omit<FolderConnection, "id" | "createdAt">): FolderConnection {
    const id = `folder-${Date.now()}`;
    const newConn: FolderConnection = {
      ...conn,
      id,
      createdAt: new Date().toISOString()
    };
    folderConnectionsStore.set(id, newConn);
    return newConn;
  }

  static getDbSchema(connId: string): DbSchemaSummary | null {
    const conn = dbConnectionsStore.get(connId);
    if (!conn) return null;

    const tables: TableSchema[] = [
      {
        name: "clientes",
        rowCount: CLIENTES.length,
        columns: [
          { name: "id", type: "INTEGER", nullable: false, isPrimaryKey: true },
          { name: "nombre", type: "VARCHAR(150)", nullable: false, isPrimaryKey: false },
          { name: "rfc_nit", type: "VARCHAR(20)", nullable: false, isPrimaryKey: false },
          { name: "email", type: "VARCHAR(100)", nullable: true, isPrimaryKey: false },
          { name: "ciudad", type: "VARCHAR(100)", nullable: true, isPrimaryKey: false }
        ]
      },
      {
        name: "facturas",
        rowCount: FACTURAS.length,
        columns: [
          { name: "id", type: "INTEGER", nullable: false, isPrimaryKey: true },
          { name: "numero", type: "VARCHAR(30)", nullable: false, isPrimaryKey: false },
          { name: "fecha", type: "DATE", nullable: false, isPrimaryKey: false },
          { name: "cliente_id", type: "INTEGER", nullable: false, isPrimaryKey: false },
          { name: "subtotal", type: "DECIMAL(12,2)", nullable: false, isPrimaryKey: false },
          { name: "iva", type: "DECIMAL(12,2)", nullable: false, isPrimaryKey: false },
          { name: "total", type: "DECIMAL(12,2)", nullable: false, isPrimaryKey: false },
          { name: "estado", type: "VARCHAR(20)", nullable: false, isPrimaryKey: false }
        ]
      },
      {
        name: "detalles_factura",
        rowCount: DETALLES_FACTURA.length,
        columns: [
          { name: "id", type: "INTEGER", nullable: false, isPrimaryKey: true },
          { name: "factura_id", type: "INTEGER", nullable: false, isPrimaryKey: false },
          { name: "concepto", type: "VARCHAR(250)", nullable: false, isPrimaryKey: false },
          { name: "cantidad", type: "INTEGER", nullable: false, isPrimaryKey: false },
          { name: "precio_unitario", type: "DECIMAL(12,2)", nullable: false, isPrimaryKey: false },
          { name: "total", type: "DECIMAL(12,2)", nullable: false, isPrimaryKey: false }
        ]
      }
    ];

    return {
      tables,
      totalTables: tables.length,
      dbType: conn.motor
    };
  }

  static getFolderSchema(connId: string): FolderSchemaSummary | null {
    const conn = folderConnectionsStore.get(connId);
    if (!conn) return null;

    const files = VIRTUAL_FOLDER_FILES.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      rowCount: file.rowCount,
      columns: file.columns,
      dateModified: file.dateModified
    }));

    const totalSize = files.reduce((acc, f) => acc + f.size, 0);

    return {
      folderName: this.maskPath(conn.folderPath),
      totalFiles: files.length,
      totalSize,
      files
    };
  }

  // Masking helpers for strict data protection
  static maskPath(fullPath: string): string {
    if (!fullPath) return "";
    const parts = fullPath.replace(/\\/g, "/").split("/");
    const lastDir = parts[parts.length - 1] || parts[parts.length - 2] || "local_folder";
    return `./[LOCAL_ROOT]/.../${lastDir}`;
  }

  static maskUri(uri: string): string {
    try {
      if (uri.startsWith("sqlite:")) return "sqlite://[LOCAL_DATABASE_FILE]";
      const url = new URL(uri);
      return `${url.protocol}//*******@${url.host}${url.pathname}`;
    } catch {
      return "uri://[LOCAL_CREDENTIALS_MASKED]";
    }
  }

  static getRawConnection(id: string, type: ConnectionType) {
    if (type === ConnectionType.DATABASE) {
      return dbConnectionsStore.get(id);
    } else {
      return folderConnectionsStore.get(id);
    }
  }
}
