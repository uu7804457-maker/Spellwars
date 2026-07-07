import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

// TODO: あかさたのFirebaseプロジェクトの値に差し替える
// Firebaseコンソール > プロジェクトの設定 > 全般 > マイアプリ でコピーできる
const firebaseConfig = {
  apiKey: "AIzaSyC51zKKuW3Sg62yulVjZeFfOAjAhe6M1Wo",
  authDomain: "spellwars.firebaseapp.com",
  databaseURL: "https://spellwars-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "spellwars",
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
 export const auth = getAuth(app);

// Anonymous Authでのサインインが完了するまで待つ。
// ルームの読み書きは全てサインイン後に行うこと。
let authReadyPromise = null;
export function ensureAuth() {
  if (!authReadyPromise) {
    authReadyPromise = new Promise((resolve, reject) => {
      onAuthStateChanged(auth, (user) => {
        if (user) resolve(user);
      });
      signInAnonymously(auth).catch(reject);
    });
  }
  return authReadyPromise;
}
