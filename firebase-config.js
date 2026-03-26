// firebase-config.js
// ⚠️ REEMPLAZA estos valores con los de tu proyecto Firebase
// Encuéntralos en: Firebase Console → Project Settings → Your apps → SDK setup

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCkSgBxKaZBEDrF_RhFGCK6tZjlzdTQt10",
  authDomain: "er-reporte---3er-periodo-44119.firebaseapp.com",
  databaseURL: "https://er-reporte---3er-periodo-44119-default-rtdb.firebaseio.com",
  projectId: "er-reporte---3er-periodo-44119",
  storageBucket: "er-reporte---3er-periodo-44119.firebasestorage.app",
  messagingSenderId: "215491922286",
  appId: "1:215491922286:web:640b1a035e9ccd6432597f"
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
