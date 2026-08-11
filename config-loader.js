export async function loadFirebaseConfig() {
  try {
    const configModule = await import("./firebase-config.js");
    return configModule.firebaseConfig;
  } catch (error) {
    throw new Error(
      "Firebase設定が見つかりません。firebase-config.example.jsをコピーしてfirebase-config.jsを作成し、設定値を入れてください。"
    );
  }
}
