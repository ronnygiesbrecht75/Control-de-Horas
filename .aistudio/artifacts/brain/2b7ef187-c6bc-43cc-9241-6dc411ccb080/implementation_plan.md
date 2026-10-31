# Historial de Tarifas con Fecha de Vigencia y Aumentos Salariales

Sistema de seguimiento histórico de tarifas horarias por empleado con fechas de vigencia precisas. Garantiza que cualquier aumento o ajuste salarial se aplique exclusivamente a partir de la fecha seleccionada, conservando los cálculos originales para los meses y días anteriores.

---

### 1. Resumen de la Funcionalidad Implementada

- **Cálculo Retroactivo Protegido**: Al cambiar o aumentar el salario de un empleado (por ejemplo de ₲ 15.000 a ₲ 18.000 a partir del 1 de octubre, o en cualquier día del mes):
  - Todos los días trabajados antes de esa fecha mantienen su tarifa histórica (₲ 15.000/h).
  - Los días a partir de la fecha de vigencia se calculan con la nueva tarifa (₲ 18.000/h).
  - Si en un mismo mes conviven dos tarifas distintas (por aumento a mitad de mes), el sistema desglosa automáticamente las horas por tarifa y suma los subtotales con total exactitud.

---

### 2. Puntos Clave de la Arquitectura

1. **Modelo de Datos (`src/types.ts`)**:
   - `HourlyRateEntry`: `{ effectiveDate: string; rate: number; notes?: string }`
   - `Employee`: contiene `hourlyRate` (tarifa actual) y `rateHistory: HourlyRateEntry[]`.

2. **Motor de Cálculo (`src/utils/timeUtils.ts`)**:
   - `getEmployeeRateForDate(employee, dateStr)`: Localiza la tarifa vigente para cualquier fecha dada, buscando en el historial la entrada más reciente con `effectiveDate <= dateStr`.
   - `calculateEmployeePeriodEarnings(employee, totalHours, dailyItems)`: Recorre los registros de días trabajados, calcula el subtotal de cada día según su tarifa aplicable y genera un desglose descriptivo si hubo más de una tarifa en el período.

3. **Gestión de Empleados (`EmployeeManagementView.tsx`)**:
   - En la tarjeta del empleado se muestra la tarifa actual y un botón dedicado **"Historial / Aumentos"**.
   - Modal interactivo de **Historial de Tarifas** donde se puede visualizar la cronología completa con etiquetas ("Vigente Hoy", "Programado a futuro"), eliminar tarifas no deseadas y registrar nuevos aumentos indicando fecha desde la cual rige, nueva tarifa y motivo.

4. **Planilla Mensual Detallada (`MonthlyGridView.tsx`)**:
   - Nueva columna en la tabla: **"Tarifa / Subtotal"** que muestra la tarifa exacta aplicada a cada día y su subtotal en guaraníes.
   - En la tarjeta superior de **Total Estimado**: si en el mes hubo cambio de salario, muestra el desglose exacto (ej. `40h a ₲ 15.000 + 44h a ₲ 18.000`).
   - Las exportaciones en **Excel** y **PDF** incluyen la tarifa aplicada por día y el resumen con el desglose.

5. **Liquidación y Pagos (`MonthlySettlementView.tsx`)**:
   - Calcula el bruto exacto sumando día a día con la tarifa vigente.
   - Muestra insignias con el detalle del aumento en las tarjetas de liquidación.
   - El desglose se traslada automáticamente a los **Recibos imprimibles (PDF)** y a los mensajes enviados por **WhatsApp**.

6. **Ex Empleados (`ExEmployeesView.tsx`)**:
   - Todas las planillas históricas de ex empleados conservan y respetan las tarifas vigentes en cada día trabajado.
