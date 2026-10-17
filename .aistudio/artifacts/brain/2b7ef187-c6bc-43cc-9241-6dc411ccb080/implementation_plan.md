# Sistema de Liquidación Quincenal (15 días) y Mensual (30 días)

Sistema flexible de liquidación y pagos que permite al administrador elegir si liquida a los empleados cada 15 días (quincenal) o cada 30 días (mensual), con selección de rango de fechas personalizada en calendario, atajos rápidos para 1ª y 2ª quincena, cálculo proporcional de horas trabajadas para sueldo fijo y por hora, y configuración individual en la ficha de cada empleado.

### User Review & Critical Decisions

> [!IMPORTANT]
> **Decisiones confirmadas por el usuario en la fase de clarificación:**
> - **División de período de 15 días**: Selector de rango de fechas personalizado en calendario (con botones rápidos para 1ª Quincena del 1 al 15 y 2ª Quincena del 16 a fin de mes, además de selección de fechas libres de 15 días).
> - **Cálculo de sueldo fijo en quincena**: Proporcional a las horas trabajadas en el período seleccionado.
> - **Ubicación de la selección**: Ambas ubicaciones — selector global de período/modo en la pestaña *Liquidación & Pagos* (permite filtrar y liquidar por 15 o 30 días) y campo de preferencia en la ficha de cada empleado (*Frecuencia de Pago: Quincenal / Mensual*).

---

### 1. Overview & Core Concept

- **Qué hace**: Agrega la capacidad de conmutar entre liquidación mensual (30 días) y liquidación quincenal (15 días o rango de fechas personalizable). Permite filtrar la planilla de liquidación para ver las horas, adelantos, bonos y total a pagar de los 15 días seleccionados o del mes completo.
- **Público objetivo**: Administradores de taller, capataces y encargados de nómina que realizan pagos quincenales o mensuales a sus colaboradores.
- **Valor clave**: Elimina la necesidad de calcular a mano los cortes de mitad de mes; los adelantos y bonos pueden registrarse específicamente para el período liquidado, generando recibos oficiales quincenales o mensuales para imprimir o enviar.

---

### 2. User Experience & Visual Design

- **Flujo de Usuario en Liquidación & Pagos**:
  1. En la parte superior de la vista de Liquidación, se incluye un control segmentado estilizado:
     - `Mensual (Mes Completo)`
     - `Quincenal (15 Días)`
  2. Al elegir **Quincenal**, aparecen de inmediato botones de selección rápida:
     - `1ª Quincena (Día 1 al 15)`
     - `2ª Quincena (Día 16 al fin)`
     - `Rango Libre`: selector con fecha de inicio y fin donde el usuario puede elegir cualquier rango de 15 días en el calendario.
  3. La tabla y tarjetas de cada empleado recalculan automáticamente las horas trabajadas dentro de ese rango exacto de fechas.
  4. Los adelantos, bonos y observaciones quedan asociados al período liquidado (quincena o mes).
  5. El botón de **Recibo / Imprimir** genera el comprobante detallando el período liquidado (ej: *Liquidación 1ª Quincena: 01/10/2026 al 15/10/2026* o *Liquidación Mensual: Octubre 2026*).

- **Flujo de Usuario en Ficha de Empleado**:
  1. En la pestaña **Empleados**, al crear o editar un empleado, se agrega la opción:
     - **Modalidad de Pago**: `Quincenal (cada 15 días)` o `Mensual (cada 30 días)`.
     - **Tipo de Remuneración**: Por Hora (con tarifa horaria) o Sueldo Fijo Mensual (con cálculo proporcional a las horas trabajadas en el período).
  2. En el listado de empleados se muestra una etiqueta clara y discreta con su modalidad (ej. `Quincenal · ₲ 18.000/h`).

- **Identidad Visual & Jerarquía**:
  - Control segmentado de período con botones activos en contraste limpio (`bg-white shadow-xs text-blue-700`).
  - Fechas y montos en tipografía monoespaciada con cifras tabulares (`tabular-nums font-mono`).
  - Sin elementos decorativos innecesarios; botones con texto claro en español (`1ª Quincena`, `2ª Quincena`, `Mes Completo`).

---

### 3. Key Product Decisions & Trade-Offs

- **Decisión 1: Asociación de Adelantos y Bonos por Período**:
  - *Enfoque*: Identificar el ajuste de liquidación con una clave compuesta `${employeeId}_${periodKey}` (por ejemplo `emp-1_2026-10_q1`, `emp-1_2026-10_q2` o `emp-1_2026-10_full`), de modo que los adelantos cobrados en la primera quincena no se mezclen ni se resten doblemente en la segunda.
  - *Por qué*: Si se pagan quincenas separadas, cada período tiene sus propios adelantos descontados y su propio estado de "Pagado/Pendiente".
- **Decisión 2: Rango Personalizado Flexible**:
  - *Enfoque*: Además de los botones directos `1ª Quincena (1-15)` y `2ª Quincena (16-fin)`, permitir al usuario modificar las fechas `Desde` y `Hasta` libremente con inputs tipo `date`.
  - *Por qué*: Cumple exactamente con la solicitud del usuario de contar con un rango personalizable en calendario si sus cortes de 15 días inician un día específico de la semana.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

```
┌─────────────────────────────────────────────────────────────┐
│                       AppState                              │
│  - employees: Employee[] (con paymentFrequency)             │
│  - records: DailyTimeRecord[]                               │
│  - adjustments: SettlementAdjustment[]                      │
│  - periodConfig: { mode: 'monthly'|'biweekly', from, to }   │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│   EmployeeManagementView     │ │   MonthlySettlementView    │
│  - Selector Frecuencia       │ │  - Selector Mes/Quincena   │
│    (15 días vs 30 días)      │ │  - Quick buttons (Q1, Q2)  │
│  - Tipo Sueldo / Tarifa      │ │  - DatePicker Desde/Hasta  │
│                              │ │  - Cálculo Horas en Rango  │
│                              │ │  - Recibo Quincenal/Mes    │
└──────────────────────────────┘ └────────────────────────────┘
```

- **Extensiones de Tipos (`src/types.ts`)**:
  - `PaymentFrequency`: `'monthly' | 'biweekly'`
  - `Employee`: agregar campo opcional `paymentFrequency?: 'monthly' | 'biweekly'`, `salaryType?: 'hourly' | 'monthly'`, `monthlySalary?: number`.
  - `MonthlySettlementAdjustment`: extender con `periodKey: string` (ej. `2026-10_q1`, `2026-10_q2`, `2026-10_custom`, `2026-10_month`), `startDate?: string`, `endDate?: string`.
- **Cálculo en `timeUtils.ts`**:
  - Función `getDaysInDateRange(startDateStr: string, endDateStr: string): string[]`.
  - Función `getBiweeklyPeriodDates(monthStr: string, quincena: 1 | 2): { start: string, end: string }`.
  - Función `calculatePeriodStats(records, employeeId, startDate, endDate)` para sumar horas y días trabajados exactamente dentro del rango seleccionado.
- **Exportación & Recibos**:
  - Los recibos impresos y el archivo CSV exportable incluirán el rango exacto de fechas y el rótulo de la quincena o mes liquidado.
