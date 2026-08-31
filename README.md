# Control de Horas y Pago Mensual

Sistema integral para el registro y cálculo automático de planillas de empleados con 2 entradas y 2 salidas diarias (turnos de mañana y tarde), adaptado con cálculo automático en Guaraníes (₲), generador de recibos imprimibles, exportación/importación de respaldos, actualizador automático de versión y flujos de trabajo de GitHub Actions para despliegues continuos.

---

## 🚀 Características Principales

1. **2 Entradas y 2 Salidas Diarias**:
   - Registro de turno mañana (Entrada 1 / Salida 1) y turno tarde (Entrada 2 / Salida 2).
   - Cálculo automático de horas trabajadas restando el intervalo del almuerzo.
   - Marcado rápido de ausencias/vacaciones y notas de incidencias.

2. **Cálculo y Arreglo Mensual**:
   - Resumen detallado de horas trabajadas acumuladas en el mes por empleado.
   - Multiplicación automática por el valor/hora pactado.
   - Gestión de adelantos de quincena, bonos y cálculo del saldo neto a pagar.
   - Generación de **Recibos de Pago Imprimibles**.

3. **Compartir por WhatsApp**:
   - Botón directo para enviar el desglose de horas y el arreglo a los empleados por WhatsApp.

4. **Actualizador Automático del Sistema (PWA & Service Worker)**:
   - Detección automática en segundo plano de nuevas versiones disponibles mediante `version.json` y Service Worker.
   - Notificación emergente con botón "Actualizar Ahora" que limpia caché y recarga la versión más reciente.
   - Botón manual de "Buscar Actualizaciones" disponible en Ajustes.

5. **Integración y Despliegue Automático en GitHub**:
   - Flujo de GitHub Actions en `.github/workflows/deploy.yml` para compilar y desplegar automáticamente en GitHub Pages ante cada push en la rama `main` o `master`.
   - Flujo de integración continua en `.github/workflows/ci.yml` para validar tipado y construcción en cada commit.

---

## 🛠️ Comandos de Desarrollo y Construcción

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Validar TypeScript
npm run lint

# Construir para producción
npm run build
```

---

## ⚙️ Despliegue Automático en GitHub

1. Sube tu código a un repositorio de GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/tu-usuario/tu-repositorio.git
   git push -u origin main
   ```
2. En GitHub ve a **Settings** > **Pages** y en **Source** selecciona **GitHub Actions**.
3. El workflow `.github/workflows/deploy.yml` se ejecutará automáticamente en cada `git push` y publicará la aplicación.
