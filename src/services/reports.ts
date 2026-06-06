/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CLIENTES, FACTURAS, DETALLES_FACTURA, VIRTUAL_FOLDER_FILES } from "../data/mockData.js";

export interface DashboardMetricSummary {
  grandTotal: number;
  grandSubtotal: number;
  grandIva: number;
  invoiceCount: number;
  paidTotal: number;
  pendingTotal: number;
  cancelledTotal: number;
  clientCount: number;
  averageInvoiceValue: number;
}

export interface ClientSummary {
  clienteId: number;
  nombre: string;
  rfc: string;
  totalSuma: number;
  ivaSuma: number;
  cantidadFacturas: number;
  estadoMasFrecuente: string;
}

export interface MonthlySummary {
  mes: string; // e.g. "2026-01"
  subtotal: number;
  iva: number;
  total: number;
  cantidad: number;
}

export interface DataAnomaly {
  tipo: "MATEMATICO" | "ESTADO_CRITICO" | "CONCEPTO_NULO" | "CORREO_INVALIDO" | "CLIENTE_HUERFANO";
  gravedad: "ALTA" | "MEDIA" | "BAJA";
  descripcion: string;
  registroId: string | number;
  tablaAsociada: string;
}

export class ReportsService {
  
  /**
   * Generates a complete executive summary profile of the business database
   */
  static generateExecutiveReport(): {
    metrics: DashboardMetricSummary;
    clientSummary: ClientSummary[];
    monthlySummary: MonthlySummary[];
    topProducts: { concepto: string; totalVendido: number; cantidadTotal: number }[];
  } {
    // 1. Calculate General Metrics
    const invoiceCount = FACTURAS.length;
    const clientCount = CLIENTES.length;
    
    let grandTotal = 0;
    let grandSubtotal = 0;
    let grandIva = 0;
    let paidTotal = 0;
    let pendingTotal = 0;
    let cancelledTotal = 0;

    for (const f of FACTURAS) {
      grandTotal += f.total;
      grandSubtotal += f.subtotal;
      grandIva += f.iva;

      if (f.estado === "PAGADA") paidTotal += f.total;
      else if (f.estado === "PENDIENTE") pendingTotal += f.total;
      else if (f.estado === "CANCELADA") cancelledTotal += f.total;
    }

    const averageInvoiceValue = invoiceCount > 0 ? grandTotal / invoiceCount : 0;

    const metrics: DashboardMetricSummary = {
      grandTotal: Number(grandTotal.toFixed(2)),
      grandSubtotal: Number(grandSubtotal.toFixed(2)),
      grandIva: Number(grandIva.toFixed(2)),
      invoiceCount,
      paidTotal: Number(paidTotal.toFixed(2)),
      pendingTotal: Number(pendingTotal.toFixed(2)),
      cancelledTotal: Number(cancelledTotal.toFixed(2)),
      clientCount,
      averageInvoiceValue: Number(averageInvoiceValue.toFixed(2))
    };

    // 2. Client Profile Breakdowns
    const clientSummary: ClientSummary[] = CLIENTES.map(cl => {
      const cFacturas = FACTURAS.filter(f => f.cliente_id === cl.id);
      const totalSuma = cFacturas.reduce((acc, f) => acc + f.total, 0);
      const ivaSuma = cFacturas.reduce((acc, f) => acc + f.iva, 0);
      
      // Determine most frequent state
      const states = cFacturas.map(f => f.estado);
      const occurrences = states.reduce((acc, state) => {
        acc[state] = (acc[state] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      let estadoMasFrecuente = "NINGUNO";
      let maxCount = 0;
      for (const [state, count] of Object.entries(occurrences)) {
        if (count > maxCount) {
          maxCount = count;
          estadoMasFrecuente = state;
        }
      }

      return {
        clienteId: cl.id,
        nombre: cl.nombre,
        rfc: cl.rfc_nit,
        totalSuma: Number(totalSuma.toFixed(2)),
        ivaSuma: Number(ivaSuma.toFixed(2)),
        cantidadFacturas: cFacturas.length,
        estadoMasFrecuente
      };
    }).sort((a, b) => b.totalSuma - a.totalSuma);

    // 3. Monthly Breakdowns
    const monthlyMap: Record<string, MonthlySummary> = {};
    for (const f of FACTURAS) {
      const mes = f.fecha.substring(0, 7); // "YYYY-MM"
      if (!monthlyMap[mes]) {
        monthlyMap[mes] = { mes, subtotal: 0, iva: 0, total: 0, cantidad: 0 };
      }
      monthlyMap[mes].subtotal += f.subtotal;
      monthlyMap[mes].iva += f.iva;
      monthlyMap[mes].total += f.total;
      monthlyMap[mes].cantidad += 1;
    }
    const monthlySummary = Object.values(monthlyMap)
      .map(m => ({
        mes: m.mes,
        subtotal: Number(m.subtotal.toFixed(2)),
        iva: Number(m.iva.toFixed(2)),
        total: Number(m.total.toFixed(2)),
        cantidad: m.cantidad
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes));

    // 4. Product / Concept performance
    const productSalesMap: Record<string, { totalVendido: number; cantidadTotal: number }> = {};
    for (const d of DETALLES_FACTURA) {
      if (!productSalesMap[d.concepto]) {
        productSalesMap[d.concepto] = { totalVendido: 0, cantidadTotal: 0 };
      }
      productSalesMap[d.concepto].totalVendido += d.total;
      productSalesMap[d.concepto].cantidadTotal += d.cantidad;
    }
    const topProducts = Object.entries(productSalesMap)
      .map(([concepto, data]) => ({
        concepto,
        totalVendido: Number(data.totalVendido.toFixed(2)),
        cantidadTotal: data.cantidadTotal
      }))
      .sort((a, b) => b.totalVendido - a.totalVendido)
      .slice(0, 5);

    return {
      metrics,
      clientSummary,
      monthlySummary,
      topProducts
    };
  }

  /**
   * Scans database collections to discover structural anomalies, calculations, maths mismatch,
   * or client orphan problems. Helpful for the "seek inconsistencies / data verification" usecase.
   */
  static detectDataAnomalies(): DataAnomaly[] {
    const anomalies: DataAnomaly[] = [];

    // 1. Math Check (Subtotal + IVA = Total)
    for (const f of FACTURAS) {
      const expectedTotal = f.subtotal + f.iva;
      const discrepancy = Math.abs(f.total - expectedTotal);
      if (discrepancy > 0.05) {
        anomalies.push({
          tipo: "MATEMATICO",
          gravedad: "ALTA",
          tablaAsociada: "facturas",
          registroId: f.id,
          descripcion: `Monto descuajado en Factura ${f.numero}: Subtotal ($${f.subtotal}) + IVA ($${f.iva}) da un total calculado de $${expectedTotal.toFixed(2)}, pero el total guardado es $${f.total}. Discrepancia de $${discrepancy.toFixed(2)}.`
        });
      }
    }

    // 2. Cancelled Status Check
    for (const f of FACTURAS) {
      if (f.estado === "CANCELADA") {
        anomalies.push({
          tipo: "ESTADO_CRITICO",
          gravedad: "MEDIA",
          tablaAsociada: "facturas",
          registroId: f.id,
          descripcion: `La Factura ${f.numero} del cliente #${f.cliente_id} por total de $${f.total} se encuentra registrada como CANCELADA. Favor de revisar justificación contable para devoluciones.`
        });
      }
    }

    // 3. Email verification and formats
    for (const c of CLIENTES) {
      if (!c.email || !c.email.includes("@")) {
        anomalies.push({
          tipo: "CORREO_INVALIDO",
          gravedad: "BAJA",
          tablaAsociada: "clientes",
          registroId: c.id,
          descripcion: `El cliente '${c.nombre}' tiene una dirección de correo inexistente o inválida: '${c.email || "N/A"}'.`
        });
      }
    }

    // 4. Client Orphan Checks (facturas belonging to unknown clients)
    for (const f of FACTURAS) {
      const clientExists = CLIENTES.some(c => c.id === f.cliente_id);
      if (!clientExists) {
        anomalies.push({
          tipo: "CLIENTE_HUERFANO",
          gravedad: "ALTA",
          tablaAsociada: "facturas",
          registroId: f.id,
          descripcion: `La factura ID ${f.id} (${f.numero}) refiere al ID de cliente inexistente #${f.cliente_id}.`
        });
      }
    }

    // 5. Invoice Line Item Math Check
    for (const f of FACTURAS) {
      const lines = DETALLES_FACTURA.filter(d => d.factura_id === f.id);
      const linesSum = lines.reduce((acc, d) => acc + d.total, 0);
      const discrepancy = Math.abs(f.subtotal - linesSum);
      if (discrepancy > 0.05) {
        anomalies.push({
          tipo: "MATEMATICO",
          gravedad: "MEDIA",
          tablaAsociada: "detalles_factura",
          registroId: f.id,
          descripcion: `La suma de líneas de detalle ($${linesSum.toFixed(2)}) no coincide con el subtotal registrado en la cabecera de la Factura ${f.numero} ($${f.subtotal}).`
        });
      }
    }

    return anomalies;
  }
}
