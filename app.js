// app.js — IBIME Portal de Calificaciones
// Lee datos de Firebase Realtime Database y renderiza el portal

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, child, get, push } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { FIREBASE_CONFIG } from "./firebase-config.js";

// ── Init Firebase ──────────────────────────────────────────
const app = initializeApp(FIREBASE_CONFIG);
const db  = getDatabase(app);
const dbRef = ref(db);

// ── DOM refs ───────────────────────────────────────────────
const inputMatricula = document.getElementById("matricula");
const btnBuscar      = document.getElementById("btnBuscar");
const divLoading     = document.getElementById("loading");
const divResultado   = document.getElementById("resultado");
const divTiempo      = document.getElementById("tiempoInfo");

// ── Eventos ────────────────────────────────────────────────
btnBuscar.addEventListener("click", consultar);
inputMatricula.addEventListener("keypress", e => {
  if (e.key === "Enter") consultar();
});

// ── Buscar alumno ──────────────────────────────────────────
async function consultar() {
  const matricula = inputMatricula.value.trim();
  if (!matricula) { alert("⚠️ Escribe una matrícula."); return; }

  mostrarLoading(true);
  divResultado.innerHTML = "";
  divTiempo.innerHTML    = "";

  const t0 = performance.now();

  try {
    // 1. Buscar alumno
    const alumnosSnap = await get(child(dbRef, "alumnos"));
    if (!alumnosSnap.exists()) throw new Error("No hay datos de alumnos en Firebase.");

    const alumnos = alumnosSnap.val();
    const clave   = sanitizarClave(matricula);
    const alumno  = alumnos[clave];

    if (!alumno) {
      renderError("❌ Matrícula no encontrada.");
      return;
    }
    logConsulta(alumno.matricula, alumno.nombre, alumno.tutor);
    
    // 2. Buscar calificaciones por correo
    const correoKey     = sanitizarClave(alumno.correo);
    const califSnap     = await get(child(dbRef, `calificaciones/${correoKey}`));
    const rawCalifs     = califSnap.exists() ? Object.values(califSnap.val()) : [];

    // 3. Agrupar por materia+profesor
    const resumen = agrupar(rawCalifs);

    const ms = ((performance.now() - t0) / 1000).toFixed(2);
    renderData(alumno, resumen, ms);

  } catch (e) {
    renderError("Error de sistema: " + e.message);
  } finally {
    mostrarLoading(false);
  }
}

// ── Agrupar calificaciones ─────────────────────────────────
function agrupar(rows) {
  const detalle = {};

  rows.forEach(fila => {
    const profesor   = (fila.profesor  || "Sin Profesor").trim();
    const asignatura = (fila.materia   || "General").trim();
    const key        = profesor + " — " + asignatura;

    if (!detalle[key]) {
      detalle[key] = { profesor, asignatura, grupo: fila.grupo || "N/A", actividades: [] };
    }

    detalle[key].actividades.push({
      fecha:        fila.fecha        || "---",
      actividad:    fila.actividad    || "Actividad",
      calificacion: fila.calificacion // null si no hay nota
    });
  });

  return Object.values(detalle).map(d => {
    const validas  = d.actividades.filter(a => a.calificacion !== null).map(a => a.calificacion);
    const promedio = validas.length ? validas.reduce((a, b) => a + b, 0) / validas.length : 0;

    return {
      materia:         d.asignatura,
      profesor:        d.profesor,
      grupo:           d.grupo,
      calificadas:     validas.length,
      totalActividades:d.actividades.length,
      promedio:        promedio.toFixed(1),
      status:          getStatus(promedio, validas.length),
      detalle:         d.actividades.map(a => ({
        fecha:        a.fecha,
        actividad:    a.actividad,
        calificacion: a.calificacion === null ? "-" : a.calificacion
      }))
    };
  });
}

// ── Status ─────────────────────────────────────────────────
function getStatus(p, count) {
  if (count === 0) return { emoji: "⏳", texto: "Pendiente",    color: "#95a5a6" };
  if (p >= 9)      return { emoji: "😎", texto: "Excelente",    color: "#3498db" };
  if (p >= 8)      return { emoji: "🙂", texto: "Satisfactorio",color: "#2ecc71" };
  if (p >= 6)      return { emoji: "⚠️", texto: "En Riesgo",    color: "#f1c40f" };
  return           { emoji: "😓", texto: "Crítico",   color: "#e74c3c" };
}

// ── Render ─────────────────────────────────────────────────
function renderData(alumno, resumen, ms) {
  let html = `
  <div class="card">
    <div class="student-header">
      <div class="student-icon">🎓</div>
      <div class="student-title">
        <h3>${alumno.nombre}</h3>
        <span>${alumno.matricula} • ${alumno.correo}</span>
      </div>
    </div>
    <div class="info-grid">
      <div class="info-item"><small>Tutor</small><div>${alumno.tutor}</div></div>
      <div class="info-item"><small>Grupo Español</small><div>${alumno.grupoEsp}</div></div>
      <div class="info-item"><small>Grupo Inglés</small><div>${alumno.grupoIng}</div></div>
    </div>
  </div>

  <div class="alert-box alert-info">
    📊 El status visual corresponde únicamente a actividades calificadas.
  </div>
  <div class="alert-box alert-warning">
    ⚠️ <strong>Nota:</strong> Los promedios oficiales pueden variar. Consulta Classroom para detalles finales.
  </div>`;

  if (!resumen.length) {
    html += `<div class="card alert-box alert-error">⚠️ No se encontraron notas registradas.</div>`;
  } else {
    html += `<div class="table-container"><table>
      <thead><tr>
        <th>Asignatura / Profesor</th>
        <th>Progreso</th>
        <th style="text-align:right">Status</th>
      </tr></thead><tbody>`;

    resumen.forEach((mat, idx) => {
      const c = mat.status.color;
      html += `
      <tr class="materia" onclick="toggle(${idx})">
        <td>
          <div style="font-weight:700;color:#1f2937;font-size:1.05rem">${mat.materia}</div>
          <div style="font-size:.85rem;color:#6b7280">${mat.profesor}</div>
        </td>
        <td>
          <div style="font-weight:bold">${mat.calificadas} / ${mat.totalActividades}</div>
          <div style="font-size:.8rem;color:#6b7280">Actividades</div>
        </td>
        <td>
          <span class="status-pill" style="background:${c}20;color:${c};border:1px solid ${c}">
            ${mat.status.emoji} ${mat.status.texto}
          </span>
        </td>
      </tr>
      <tr class="detalle" id="det-${idx}">
        <td colspan="3" style="padding:0;border:none">
          <div class="detail-wrapper">
            <table class="mini-table">
              <tr><th>Actividad</th><th>Fecha</th><th>Calif.</th></tr>
              ${mat.detalle.map(a => {
                const cls = (a.calificacion >= 8) ? "score-high"
                          : (a.calificacion !== "-" && a.calificacion < 6) ? "score-low"
                          : "score";
                return `<tr>
                  <td>${a.actividad}</td>
                  <td>${a.fecha}</td>
                  <td class="${cls}">${a.calificacion}</td>
                </tr>`;
              }).join("")}
            </table>
          </div>
        </td>
      </tr>`;
    });

    html += `</tbody></table></div>`;
  }

  divResultado.innerHTML = html;
  divTiempo.innerHTML    = `⏱️ Datos cargados en ${ms} seg`;
}

function renderError(msg) {
  divResultado.innerHTML = `<div class="card alert-box alert-error" style="font-weight:bold;font-size:1.1rem">${msg}</div>`;
}

function mostrarLoading(show) {
  divLoading.style.display = show ? "block" : "none";
}

// ── Toggle acordeón ────────────────────────────────────────
window.toggle = function(idx) {
  const target   = document.getElementById("det-" + idx);
  const isOpen   = target.classList.contains("active");
  document.querySelectorAll(".detalle").forEach(r => r.classList.remove("active"));
  if (!isOpen) target.classList.add("active");
};

// ── Helpers ────────────────────────────────────────────────
function sanitizarClave(str) {
  return str.replace(/[.#$[\]/]/g, "_");
}
// Esta función guarda el log de la búsqueda en Firebase
function logConsulta(matricula, nombre, tutor) {
  const now = new Date();
  const logRef = ref(db, 'logs_consultas'); // Nodo 'logs_consultas' en tu base de datos
  push(logRef, {
    matricula: matricula,
    nombre: nombre,
    tutor: tutor,
    fecha: now.toISOString()
  });
}
