# 🎓 IBIME — Portal de Calificaciones

Portal web para consulta de calificaciones de alumnos.  
**Stack**: Google Sheets → Apps Script → Firebase Realtime Database → GitHub Pages

---

## 📁 Estructura del repo

```
ibime-portal-calificaciones/
│
├── index.html           ← Portal del alumno (HTML)
├── app.js               ← Lógica: consulta Firebase y renderiza
├── styles.css           ← Estilos del portal
├── firebase-config.js   ← Credenciales Firebase (solo lectura pública)
│
├── sync/
│   └── SyncToFirebase.gs  ← Script GAS: lee Sheets y escribe en Firebase
│
└── README.md
```

---

## 🚀 Configuración paso a paso

### 1. Crear proyecto en Firebase

1. Ve a [console.firebase.google.com](https://console.firebase.google.com)
2. Clic en **Add project** → escribe "ibime-portal" → continúa
3. Desactiva Google Analytics (opcional) → **Create project**
4. En el menú izquierdo: **Build → Realtime Database → Create database**
   - Elige la región más cercana (us-central1 está bien)
   - Empieza en **test mode** (lo aseguramos después)

---

### 2. Configurar firebase-config.js

1. En Firebase Console → **Project Settings** (ícono ⚙️) → pestaña **General**
2. En "Your apps", clic en **</>** (Web) → registra la app con el nombre "portal"
3. Copia el objeto `firebaseConfig` y pégalo en `firebase-config.js`:

```js
// firebase-config.js
export const FIREBASE_CONFIG = {
  apiKey:            "AIzaSy...",
  authDomain:        "ibime-portal.firebaseapp.com",
  databaseURL:       "https://ibime-portal-default-rtdb.firebaseio.com",
  projectId:         "ibime-portal",
  storageBucket:     "ibime-portal.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc..."
};
```

> ⚠️ Agrega `export const` al inicio — es necesario para que `app.js` lo importe.

---

### 3. Configurar reglas de seguridad en Firebase

En **Realtime Database → Rules**, pega esto:

```json
{
  "rules": {
    ".read": true,
    ".write": false
  }
}
```

Lectura pública (el portal la necesita), escritura bloqueada (solo Apps Script puede escribir con el secret).

---

### 4. Configurar SyncToFirebase.gs en Apps Script

1. Abre tu Google Spreadsheet con las hojas **BASE ALUMNOS** y **Maestro**
2. Ve a **Extensions → Apps Script**
3. Copia y pega el contenido de `sync/SyncToFirebase.gs`
4. Reemplaza en el objeto `CONFIG`:

```js
FIREBASE_URL:    "https://TU-PROYECTO-default-rtdb.firebaseio.com",
FIREBASE_SECRET: "TU_DATABASE_SECRET"
```

**¿Dónde consigo el Database Secret?**  
Firebase Console → Project Settings → **Service accounts** → **Database secrets** → Show

> ⚠️ El Database Secret es un método legacy pero simple. Para producción real considera Service Accounts.

5. Ejecuta `syncAll` una vez manualmente para probar
6. Ejecuta `crearTrigger` una vez para activar la sincronización automática cada hora

---

### 5. Subir a GitHub y activar GitHub Pages

```bash
# Clona o crea el repo
git init
git add .
git commit -m "feat: portal IBIME con Firebase"
git remote add origin https://github.com/tu-usuario/ibime-portal.git
git push -u origin main
```

Luego en GitHub:
1. **Settings → Pages**
2. Source: **Deploy from a branch** → branch `main` → folder `/ (root)`
3. Clic en **Save**

En ~2 minutos tu portal estará en:  
`https://tu-usuario.github.io/ibime-portal/`

---

## 🔄 Flujo de datos

```
Tú editas Sheets
      ↓  (trigger cada hora)
Apps Script lee Sheets
      ↓  (PUT via REST)
Firebase Realtime Database
      ↓  (Firebase SDK)
GitHub Pages (portal)
      ↓
Alumno ingresa matrícula → ve sus notas
```

---

## 🗂️ Estructura de datos en Firebase

```
/alumnos/
  {clave_matricula}/
    matricula, nombre, tutor, grupoEsp, grupoIng, correo

/calificaciones/
  {clave_correo}/
    0/ → { profesor, grupo, alumno, correo, fecha, actividad, calificacion, materia }
    1/ → { ... }
    ...

/meta/
  ultimaSync: "2024-01-15T10:30:00.000Z"
```

---

## 🛠️ Mantenimiento

| Tarea | Acción |
|---|---|
| Agregar alumnos | Edita la hoja "BASE ALUMNOS" en Sheets → espera el trigger (o ejecuta `syncAll` manualmente) |
| Agregar calificaciones | Edita la hoja "Maestro" → igual |
| Forzar sync inmediata | En Apps Script → ejecutar `syncAll` |
| Ver logs de sync | Apps Script → **Executions** |
| Ver datos en Firebase | Firebase Console → Realtime Database → Data |

---

## ❓ Preguntas frecuentes

**¿Por qué no veo mis datos en el portal después de editar Sheets?**  
El trigger sincroniza cada hora. Para ver cambios inmediatos, ejecuta `syncAll` manualmente en Apps Script.

**¿Es seguro tener firebase-config.js público en GitHub?**  
Sí, para este caso. Las credenciales de Firebase en el cliente son públicas por diseño — la seguridad está en las **Rules** de Firebase que bloquean la escritura.

**¿Puedo cambiar el intervalo de sincronización?**  
Sí, en `crearTrigger()` cambia `.everyHours(1)` por `.everyMinutes(30)` o el intervalo que necesites. Recuerda ejecutar `crearTrigger` de nuevo.
