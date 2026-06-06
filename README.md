# Local Data Agent

**Local Data Agent** es una aplicación *local-first* de tipo escritorio/web que permite conectar bases de datos relacionales y carpetas locales de archivos para chatear con un consultor de IA avanzado, analizar tendencias, rastrear impuestos (como el IVA) y exportar datasets empresariales con **privacidad absoluta**.

---

## 🛡️ Principios Críticos de Privacidad y Seguridad por Diseño
La mayor parte de los agentes tradicionales envían las contraseñas, URIs de conexión completas o registros crudos de datos directamente a las nubes de LLM, incurriendo en riesgos legales y de protección intelectual. **Local Data Agent resuelve esto de raíz**:

1. **Credenciales en Local**: Las contraseñas, tokens y rutas absolutas jamás viajan a la red ni al LLM. Permanecen cifradas y almacenadas en el cliente o el servidor local.
2. **Contexto Sanitizado**: El LLM solo recibe un esquema descriptivo anonimizado (nombres de tablas, nombres de archivos, tipos de datos, recuentos de registros agregados, y estadísticas generales de tamaño).
3. **Sandbox SQL de Lectura**: Las consultas SQL se evalúan de forma estrictamente local. El agente inteligente propone sentencias de consulta, las cuales son validadas por un Sandbox antes de su ejecución para rechazar inyecciones mutadoras (`DROP`, `DELETE`, `UPDATE`, `INSERT`, `TRUNCATE`, `ALTER`, etc.).

---

## 🌟 Características Principales

### 1. Conexiones Flexibles
- **Base de Datos**: Formulario adaptativo compatible con SQLite, PostgreSQL, MySQL/MariaDB y SQL Server.
- **Carpetas de Planillas**: Escaneo estructurado y perfilados lógicos de archivos locales CSV, JSON y TXT.
- **Indexadores Rápidos**: Conexión a bases de datos y carpetas de demostración en un solo clic para evaluar flujos de prueba sin configuraciones previas (datos de facturación corporativa precargados).

### 2. Conversación Contextual e Inteligencia de Datos
- **Auditorías y Detección de Inconsistencias**: Escáner automático para detectar errores de cuadre matemático (e.g., comprobar si Subtotal + IVA coincide con el Total general, rastrear facturas canceladas, o encontrar correos corporativos inválidos).
- **Tratamiento de Impuestos**: Desglose tributario de IVA en tiempo real para estados comerciales (pagados, pendientes, anulados).

### 3. Voz, Síntesis y Modo Manos Libres
- **Dictado con Voz (Speech-to-Text)**: Botón de micrófono con reconocimiento instantáneo de voz para consultas verbales fluidas.
- **Respuesta Hablada (Text-to-Speech)**: El agente responde con locución clara y natural usando sintetizadores locales.
- **Modo Manos Libres Continuo**: Flujo manos libres donde el agente escucha tu pregunta, responde por audio, y queda listo escuchando para responder tu siguiente inquietud de inmediato sin clics en pantalla.

### 4. Sandbox SQL con Tablas Interactivas
- Cada vez que el agente te sugiera una consulta SQL, se pintará un Sandbox en tu consola de chat. Con un clic puedes ejecutarla y ver una tabla interactiva completa con filtros, ordenamiento, fila de totales y exportador Excel/CSV integrado.

---

## 📁 Arquitectura Estructurada y Modular

El proyecto cuenta con un diseño modular con separación clara de competencias:

```
├── /server.ts                # Servidor Express, API REST (Status, Connect, Chat, SQL Sandbox, Exportadores)
├── /src/
│   ├── /types.ts             # Declaración de interfaces y enums (DbMotor, ConnectionStatus, ChatMessage)
│   ├── /App.tsx              # UI Interactiva y controles de voz/manos libres (React 19 + Tailwind v4)
│   ├── /main.tsx             # Punto de acceso de React
│   ├── /index.css            # Fuentes premium e integraciones CSS
│   ├── /data/
│   │   └── /mockData.ts      # Semillas físicas locales para Demo SQLite de facturas y archivos carpetas
│   └── /services/
│       ├── /connectors.ts    # Enmascarador, inspectores de esquemas y conexión local-first
│       ├── /queryEngine.ts   # Validador de queries de solo lectura y ejecutor SQL del sandbox local
│       ├── /reports.ts       # Cálculos contables ejecutivos y escáner automático de anomalías
│       └── /agentService.ts  # Orquestador del agente Gemini API (gemini-3.5-flash) con modo de Fallback Offline
└── /tests/
    └── /run_tests.ts         # Banco de pruebas de assertions unitarias
```

---

## 🔧 Ejecutar y Probar

### ⚙️ Prerequisitos e Instalación
Instala las dependencias declaradas en el administrador de paquetes del proyecto:
```bash
npm install
```

### 🏎️ Iniciar Servidor de Desarrollo full-stack
Arranca el servidor local Express con su middleware de Vite de forma integrada:
```bash
npm run dev
```
La aplicación quedará abierta en el puerto `3000` (`http://localhost:3000`).

### 📦 Compilación de Producción
Genera la compilación optimizada del frontend de Vite e integra el servidor Express como un binario CommonJS súper ligero en `dist/server.cjs`:
```bash
npm run build
npm start
```

---

## 🧪 Banco de Pruebas Automatizadas (Unit Tests)

Hemos programado un banco de assertions unitarias para validar de forma automatizada que los mecanismos de enmascaramiento, restricciones en el sandbox SQL de lectura, cálculos de anomalías de IVA y fallbacks offline operen de manera rigurosa.

Para correr las pruebas, ejecuta:
```bash
npx tsx tests/run_tests.ts
```

---

## 💡 Flujo de Trabajo en Acción (Cómo Probar la Demo)
1. Inicia la app y haz clic en **Base de Datos SQLite de Demostración** (se conecta de inmediato).
2. Pregúntale al agente por voz o texto: *"¿Cómo está estructurada la base de datos?"*
3. Consulta: *"Calculá el total de IVA a pagar."* (El agente te sugerirá un SQL `SELECT`).
4. Haz clic en **Ejecutar Consulta** en la tarjeta de Sandbox del chat; verás la tabla con los registros exactos.
5. Haz clic en **Exportar a Excel** para descargar la hoja de cálculo generada en tiempo real.
6. Cambia al tab **Auditorías** en el panel izquierdo para examinar las discrepancias detectadas por nuestro perfilador analítico.
