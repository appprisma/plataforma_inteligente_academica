// ============================================================
//  SyncToFirebase.gs — IBIME Portal de Calificaciones
//  Sincroniza Google Sheets → Firebase Realtime Database
//  Instalar en: Extensions > Apps Script del mismo Spreadsheet
// ============================================================

var CONFIG = {
  // ⚠️ REEMPLAZA con tu URL de Firebase Realtime Database
  FIREBASE_URL: "https://TU-PROYECTO-default-rtdb.firebaseio.com",

  // ⚠️ REEMPLAZA con tu Secret o usa Service Account (ver README)
  FIREBASE_SECRET: "TU_DATABASE_SECRET",

  HOJA_ALUMNOS: "BASE ALUMNOS",
  HOJA_MAESTRO: "Maestro",

  // Columnas BASE ALUMNOS
  BD_COL_MATRICULA: 0,
  BD_COL_NOMBRE:    1,
  BD_COL_TUTOR:     2,
  BD_COL_GPO_ESP:   3,
  BD_COL_GPO_ING:   4,
  BD_COL_CORREO:    5,

  // Columnas Maestro
  MAE_PROFESOR:  0,
  MAE_GRUPO:     1,
  MAE_ALUMNO:    2,
  MAE_CORREO:    3,
  MAE_FECHA:     4,
  MAE_ACTIVIDAD: 5,
  MAE_CALIF:     6,
  MAE_MATERIA:   7
};

// ------------------------------------------------------------
//  ENTRADA PRINCIPAL — llama esto manualmente o con trigger
// ------------------------------------------------------------
function syncAll() {
  Logger.log("⏳ Iniciando sincronización...");
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var alumnos = leerAlumnos(ss);
  var calificaciones = leerCalificaciones(ss);

  writeToFirebase("/alumnos", alumnos);
  writeToFirebase("/calificaciones", calificaciones);
  writeToFirebase("/meta/ultimaSync", new Date().toISOString());

  Logger.log("✅ Sincronización completa.");
}

// ------------------------------------------------------------
//  Configurar trigger automático (ejecuta syncAll cada hora)
//  Llama esta función UNA SOLA VEZ desde el editor de GAS
// ------------------------------------------------------------
function crearTrigger() {
  // Elimina triggers anteriores para no duplicar
  ScriptApp.getProjectTriggers().forEach(function(t) {
    ScriptApp.deleteTrigger(t);
  });

  ScriptApp.newTrigger("syncAll")
    .timeBased()
    .everyHours(1)
    .create();

  Logger.log("✅ Trigger creado: syncAll cada hora.");
}

// ------------------------------------------------------------
//  Leer alumnos de la hoja BASE ALUMNOS
// ------------------------------------------------------------
function leerAlumnos(ss) {
  var hoja = ss.getSheetByName(CONFIG.HOJA_ALUMNOS);
  var data = hoja.getDataRange().getValues();
  var alumnos = {};

  for (var i = 1; i < data.length; i++) {
    var fila = data[i];
    var matricula = String(fila[CONFIG.BD_COL_MATRICULA]).trim();
    if (!matricula) continue;

    // Sanitizar matrícula para usarla como clave Firebase (sin puntos ni #/$[])
    var clave = sanitizarClave(matricula);

    alumnos[clave] = {
      matricula: matricula,
      nombre:    String(fila[CONFIG.BD_COL_NOMBRE] || "").trim(),
      tutor:     String(fila[CONFIG.BD_COL_TUTOR]  || "No asignado").trim(),
      grupoEsp:  String(fila[CONFIG.BD_COL_GPO_ESP]|| "---").trim(),
      grupoIng:  String(fila[CONFIG.BD_COL_GPO_ING]|| "---").trim(),
      correo:    String(fila[CONFIG.BD_COL_CORREO] || "").toLowerCase().trim()
    };
  }

  return alumnos;
}

// ------------------------------------------------------------
//  Leer calificaciones de la hoja Maestro
//  Estructura: calificaciones/{correo_sanitizado}/{index}
// ------------------------------------------------------------
function leerCalificaciones(ss) {
  var hoja = ss.getSheetByName(CONFIG.HOJA_MAESTRO);
  var data = hoja.getDataRange().getValues();
  var calificaciones = {};

  for (var j = 1; j < data.length; j++) {
    var fila = data[j];
    var correo = String(fila[CONFIG.MAE_CORREO] || "").toLowerCase().trim();
    if (!correo) continue;

    var clave = sanitizarClave(correo);
    if (!calificaciones[clave]) calificaciones[clave] = [];

    var fechaStr = "---";
    if (fila[CONFIG.MAE_FECHA] instanceof Date) {
      fechaStr = Utilities.formatDate(fila[CONFIG.MAE_FECHA], "GMT-6", "dd/MM/yyyy");
    } else {
      fechaStr = String(fila[CONFIG.MAE_FECHA] || "---");
    }

    var valCalif = fila[CONFIG.MAE_CALIF];
    var calNum = null;
    if (valCalif !== "" && valCalif !== null) {
      var p = parseFloat(String(valCalif).replace(",", "."));
      if (!isNaN(p)) calNum = p;
    }

    calificaciones[clave].push({
      profesor:   String(fila[CONFIG.MAE_PROFESOR]  || "Sin Profesor").trim(),
      grupo:      String(fila[CONFIG.MAE_GRUPO]     || "N/A").trim(),
      alumno:     String(fila[CONFIG.MAE_ALUMNO]    || "").trim(),
      correo:     correo,
      fecha:      fechaStr,
      actividad:  String(fila[CONFIG.MAE_ACTIVIDAD] || "Actividad").trim(),
      calificacion: calNum,
      materia:    String(fila[CONFIG.MAE_MATERIA]   || "General").trim()
    });
  }

  // Firebase no acepta arrays con índices numéricos directos en PUT masivo
  // Convertimos cada array a objeto con claves "0","1","2"...
  var resultado = {};
  for (var k in calificaciones) {
    resultado[k] = {};
    calificaciones[k].forEach(function(item, idx) {
      resultado[k][idx] = item;
    });
  }

  return resultado;
}

// ------------------------------------------------------------
//  Escribir datos en Firebase via REST
// ------------------------------------------------------------
function writeToFirebase(path, data) {
  var url = CONFIG.FIREBASE_URL + path + ".json?auth=" + CONFIG.FIREBASE_SECRET;

  var options = {
    method: "PUT",
    contentType: "application/json",
    payload: JSON.stringify(data),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  var code = response.getResponseCode();

  if (code !== 200) {
    Logger.log("❌ Error en " + path + " — HTTP " + code + ": " + response.getContentText());
  } else {
    Logger.log("✅ Escrito en Firebase: " + path);
  }
}

// ------------------------------------------------------------
//  Sanitizar strings para usarlos como claves Firebase
//  Firebase no permite: . # $ [ ] /
// ------------------------------------------------------------
function sanitizarClave(str) {
  return str.replace(/[.#$\[\]\/]/g, "_");
}
