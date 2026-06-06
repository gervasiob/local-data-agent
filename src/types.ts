/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum ConnectionType {
  DATABASE = "DATABASE",
  FOLDER = "FOLDER",
  GOOGLE_DRIVE = "GOOGLE_DRIVE"
}

export enum DbMotor {
  SQLITE = "SQLite",
  POSTGRESQL = "PostgreSQL",
  MYSQL = "MySQL/MariaDB",
  SQLSERVER = "SQL Server"
}

export interface DbConnection {
  id: string;
  name: string;
  motor: DbMotor;
  uri?: string;
  host?: string;
  port?: string;
  user?: string;
  password?: string;
  database?: string;
  createdAt: string;
}

export interface FolderConnection {
  id: string;
  name: string;
  folderPath: string; // Stored only locally
  createdAt: string;
}

export interface ActiveConnection {
  id: string;
  type: ConnectionType;
  name: string;
}

export interface TableColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
}

export interface TableSchema {
  name: string;
  columns: TableColumnSchema[];
  rowCount: number;
}

export interface DbSchemaSummary {
  tables: TableSchema[];
  totalTables: number;
  dbType: DbMotor;
}

export interface FileMetadata {
  name: string;
  size: number; // bytes
  type: string; // e.g., 'csv', 'json', 'pdf', 'txt'
  rowCount?: number; // if tabular
  columns?: string[]; // if tabular
  dateModified: string;
}

export interface FolderSchemaSummary {
  folderName: string;
  totalFiles: number;
  totalSize: number;
  files: FileMetadata[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  isAudioGenerated?: boolean;
  audioBase64?: string; // Optional synthesized speech
  suggestedSql?: string; // If model suggested SQL
  sqlQueryResult?: {
    columns: string[];
    rows: any[];
    error?: string;
    affectedRows?: number;
  };
}

export interface ConnectionStatus {
  isConnected: boolean;
  activeId: string | null;
  activeType: ConnectionType | null;
  activeName: string | null;
  schemaSummary: DbSchemaSummary | FolderSchemaSummary | null;
  aiProvider?: "gemini" | "openai" | "offline";
  aiModel?: string;
  extractedDataContext?: {
    columns: string[];
    rows: any[];
    query: string;
    sourceName: string;
  } | null;
}
