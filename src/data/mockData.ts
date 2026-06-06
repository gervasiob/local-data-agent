/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Mock Tables structure for Database Choice (The typical business invoices database)
export const CLIENTES = [
  { id: 1, nombre: "Distribuidora Alimentos S.A.", rfc_nit: "DIS890314AL1", email: "ventas@distalimentos.com", ciudad: "CDMX" },
  { id: 2, nombre: "Consultores de Software S.C.", rfc_nit: "CSO150720SF9", email: "admin@softconsultores.mx", ciudad: "Monterrey" },
  { id: 3, nombre: "Estilo & Moda Retail", rfc_nit: "EMR211015ED3", email: "facturas@estiloretail.com", ciudad: "Guadalajara" },
  { id: 4, nombre: "Logística y Envíos Express", rfc_nit: "LEX180402EX5", email: "pagos@logisticaexpress.com", ciudad: "Querétaro" },
  { id: 5, nombre: "Abarrotes El Sol Naciente", rfc_nit: "ASN120930EL2", email: "solnaciente@gmail.com", ciudad: "Puebla" }
];

export const FACTURAS = [
  { id: 101, numero: "FAC-2026-001", fecha: "2026-01-10", cliente_id: 1, subtotal: 12500.00, iva: 2000.00, total: 14500.00, estado: "PAGADA" },
  { id: 102, numero: "FAC-2026-002", fecha: "2026-01-15", cliente_id: 2, subtotal: 35000.00, iva: 5600.00, total: 40600.00, estado: "PAGADA" },
  { id: 103, numero: "FAC-2026-003", fecha: "2026-02-02", cliente_id: 3, subtotal: 8200.50, iva: 1312.08, total: 9512.58, estado: "PENDIENTE" },
  { id: 104, numero: "FAC-2026-004", fecha: "2026-02-18", cliente_id: 1, subtotal: 15400.00, iva: 2464.00, total: 17864.00, estado: "PAGADA" },
  { id: 105, numero: "FAC-2026-005", fecha: "2026-03-05", cliente_id: 4, subtotal: 18900.00, iva: 3024.00, total: 21924.00, estado: "PAGADA" },
  { id: 106, numero: "FAC-2026-033", fecha: "2026-03-24", cliente_id: 2, subtotal: 42000.00, iva: 6720.00, total: 48720.00, estado: "PENDIENTE" },
  { id: 107, numero: "FAC-2026-034", fecha: "2026-04-12", cliente_id: 5, subtotal: 6200.00, iva: 992.00, total: 7192.00, estado: "PAGADA" },
  { id: 108, numero: "FAC-2026-035", fecha: "2026-04-20", cliente_id: 3, subtotal: 11450.00, iva: 1832.00, total: 13282.00, estado: "PAGADA" },
  { id: 109, numero: "FAC-2026-036", fecha: "2026-05-02", cliente_id: 1, subtotal: 22000.00, iva: 3520.00, total: 25520.00, estado: "CANCELADA" },
  { id: 110, numero: "FAC-2026-040", fecha: "2026-05-15", cliente_id: 5, subtotal: 4800.00, iva: 768.00, total: 5568.00, estado: "PAGADA" },
  { id: 111, numero: "FAC-2026-041", fecha: "2026-05-28", cliente_id: 4, subtotal: 29000.00, iva: 4640.00, total: 33640.00, estado: "PENDIENTE" }
];

export const DETALLES_FACTURA = [
  { id: 1, factura_id: 101, concepto: "Caja de harinas preparadas 10kg", cantidad: 5, precio_unitario: 1500.00, total: 7500.00 },
  { id: 2, factura_id: 101, concepto: "Sacos de azúcar ultra-refinada 25kg", cantidad: 10, precio_unitario: 500.00, total: 5000.00 },
  { id: 3, factura_id: 102, concepto: "Desarrollo Módulo Inventarios ERP Correo", cantidad: 1, precio_unitario: 35000.00, total: 35000.00 },
  { id: 4, factura_id: 103, concepto: "Lote de playeras deportivas poliéster", cantidad: 50, precio_unitario: 110.00, total: 5500.00 },
  { id: 5, factura_id: 103, concepto: "Lote de calcetines deportivos pack x3", cantidad: 45, precio_unitario: 60.01, total: 2700.50 },
  { id: 6, factura_id: 104, concepto: "Cajas de aceite vegetal premium 20L", cantidad: 8, precio_unitario: 1925.00, total: 15400.00 },
  { id: 7, factura_id: 105, concepto: "Servicio de flete consolidado inter-estatal", cantidad: 3, precio_unitario: 6300.00, total: 18900.00 },
  { id: 8, factura_id: 106, concepto: "Soporte anual infraestructura AWS", cantidad: 1, precio_unitario: 42000.00, total: 42000.00 },
  { id: 9, factura_id: 107, concepto: "Cajas de leche premium entera 12 pzs", cantidad: 20, precio_unitario: 310.00, total: 6200.00 },
  { id: 10, factura_id: 108, concepto: "Vestido formal de noche colección primavera", cantidad: 10, precio_unitario: 1145.00, total: 11450.00 },
  { id: 11, factura_id: 109, concepto: "Harina de trigo industrial saco 50kg", cantidad: 11, precio_unitario: 2000.00, total: 22000.00 },
  { id: 12, factura_id: 110, concepto: "Botellones de agua purificada 20L", cantidad: 80, precio_unitario: 60.00, total: 4800.00 },
  { id: 13, factura_id: 111, concepto: "Arrendamiento de montacargas eléctrico 1 mes", cantidad: 2, precio_unitario: 14500.00, total: 29000.00 }
];

// Mock folder files data representing physical folder
export const VIRTUAL_FOLDER_FILES = [
  {
    name: "resumen_ventas_2026.csv",
    size: 2450,
    type: "csv",
    dateModified: "2026-05-10T14:30:00Z",
    rowCount: 11,
    columns: ["Id_Factura", "Numero_Factura", "Fecha", "Cliente", "Subtotal", "IVA", "Total", "Estado"],
    content: `Id_Factura,Numero_Factura,Fecha,Cliente,Subtotal,IVA,Total,Estado
101,FAC-2026-001,2026-01-10,Distribuidora Alimentos S.A.,12500.00,2000.00,14500.00,PAGADA
102,FAC-2026-002,2026-01-15,Consultores de Software S.C.,35000.00,5600.00,40600.00,PAGADA
103,FAC-2026-003,2026-02-02,Estilo & Moda Retail,8200.50,1312.08,9512.58,PENDIENTE
104,FAC-2026-004,2026-02-18,Distribuidora Alimentos S.A.,15400.00,2464.00,17864.00,PAGADA
105,FAC-2026-005,2026-03-05,Logística y Envíos Express,18900.00,3024.00,21924.00,PAGADA
106,FAC-2026-033,2026-03-24,Consultores de Software S.C.,42000.00,6720.00,48720.00,PENDIENTE
107,FAC-2026-034,2026-04-12,Abarrotes El Sol Naciente,6200.00,992.00,7192.00,PAGADA
108,FAC-2026-035,2026-04-20,Estilo & Moda Retail,11450.00,1832.00,13282.00,PAGADA
109,FAC-2026-036,2026-05-02,Distribuidora Alimentos S.A.,22000.00,3520.00,25520.00,CANCELADA
110,FAC-2026-040,2026-05-15,Abarrotes El Sol Naciente,4800.00,768.00,5568.00,PAGADA
111,FAC-2026-041,2026-05-28,Logística y Envíos Express,29000.00,4640.00,33640.00,PENDIENTE`
  },
  {
    name: "presupuestos_anual_2026.json",
    size: 1540,
    type: "json",
    dateModified: "2026-03-01T09:15:00Z",
    content: JSON.stringify({
      ano: 2026,
      departamentos: {
        ventas: { asignado: 150000, ejecutado: 45000, remanente: 105000 },
        marketing: { asignado: 85000, ejecutado: 38000, remanente: 47000 },
        it: { asignado: 300000, ejecutado: 125000, remanente: 175000 },
        operaciones: { asignado: 220000, ejecutado: 95000, remanente: 125000 }
      },
      proyeccion_recaudo_iva: 50000
    }, null, 2)
  },
  {
    name: "guia_tributaria_iva_2026.txt",
    size: 980,
    type: "txt",
    dateModified: "2026-01-02T10:00:00Z",
    content: `GUÍA PRÁCTICA DEL IVA PARA FACTURACIÓN - EJERCICIO FISCAL 2026:

1. TASA DE IVA GENERAL:
El Impuesto al Valor Agregado (IVA) se aplica de forma general al 16% sobre el subtotal de todas las facturas de bienes y servicios prestados.

2. TRATAMIENTO DE IVA POR SUBSECTOR:
   - Servicios Tecnológicos: 16% (Sujeto a retención si aplica a intermediación).
   - Enajenación de Alimentos Básicos e Harinas Industriales: Tasa de 0% en materias primas puras, pero las harinas preparadas o procesados pueden aplicar tasas según legislación local (normalmente 16%). En nuestro modelo simplificado, usamos el 16%.
   - Servicios de Logística y Fletes: 16%, con retención obligatoria del 4% del subtotal en concepto de IVA retenido a transportistas (se reporta en cuentas separadas).

3. FÓRMULA DE FACTURA:
   - Subtotal = Sumatoria del total de cada concepto (Cantidad * Precio Unitario).
   - IVA = Subtotal * 0.16 (Redondeado a 2 decimales).
   - Total = Subtotal + IVA.

Nota: Para inconsistencias, validar que el subtotal y el IVA sumen exactamente el valor total.`
  },
  {
    name: "plantilla_proveedores.json",
    size: 780,
    type: "json",
    dateModified: "2026-02-14T11:45:00Z",
    content: JSON.stringify([
      { id: "P01", razonSocial: "Harina del Valle Corp", contacto: "jose@harinasvalle.com", estatus: "Activo" },
      { id: "P02", razonSocial: "TecnoRed Computación", contacto: "soporte@tecnored.net", estatus: "Activo" },
      { id: "P03", razonSocial: "Imprenta Color Express", contacto: "ventas@colorexpress.com", estatus: "Suspendido" }
    ], null, 2)
  }
];
