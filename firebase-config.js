// firebase-config.js
// ⚠️ REEMPLAZA estos valores con los de tu proyecto Firebase
// Encuéntralos en: Firebase Console → Project Settings → Your apps → SDK setup

const FIREBASE_CONFIG = {
  apiKey:            "TU_API_KEY",
  authDomain:        "TU-PROYECTO.firebaseapp.com",
  databaseURL:       "https://TU-PROYECTO-default-rtdb.firebaseio.com",
  projectId:         "TU-PROYECTO",
  storageBucket:     "TU-PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId:             "TU_APP_ID"
};

// Reglas de seguridad recomendadas para Firebase Realtime Database:
// (pégalas en Firebase Console → Realtime Database → Rules)
//
// {
//   "rules": {
//     ".read": true,    // Lectura pública (solo matrícula, sin datos sensibles extra)
//     ".write": false   // Escritura solo via Apps Script con el secret
//   }
// }
