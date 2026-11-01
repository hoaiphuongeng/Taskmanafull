// Nhập các thư viện Firebase phiên bản Compat cần thiết cho Service Worker
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Khởi tạo Firebase trong Service Worker (Dùng cấu hình của dự án taskmana-shp)
firebase.initializeApp({
  apiKey: "AIzaSyDicItwzwlQWox8pL7qDleljWAyY3N56jk",
  authDomain: "taskmana-shp.firebaseapp.com",
  projectId: "taskmana-shp",
  storageBucket: "taskmana-shp.firebasestorage.app",
  messagingSenderId: "77320945086",
  appId: "1:77320945086:web:afdcbe07c674ed02820def"
});

const messaging = firebase.messaging();

// Lắng nghe và hiển thị thông báo khi ứng dụng đang chạy ngầm hoặc tắt tab
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Nhận thông báo ngầm:', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.png' // Đường dẫn tới icon hiển thị trên thông báo điện thoại
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});