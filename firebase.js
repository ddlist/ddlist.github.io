/* firebase.js — Firebase init (replace config with your project values) */
// var firebaseConfig = {
//   apiKey: "AIzaSyD_REPLACE_WITH_YOUR_KEY",
//   authDomain: "ddlist.firebaseapp.com",
//   projectId: "ddlist",
//   storageBucket: "ddlist.appspot.com",
//   messagingSenderId: "000000000000",
//   appId: "1:000000000000:web:0000000000000000"
// };

var firebaseConfig = {
  apiKey: "AIzaSyA2PFGE6cRQBIz7_9XXoEaTWPX4mt5gnNw",
  authDomain: "dd-list-3baae.firebaseapp.com",
  projectId: "dd-list-3baae",
  storageBucket: "dd-list-3baae.firebasestorage.app",
  messagingSenderId: "536499018997",
  appId: "1:536499018997:web:c808e6b6181adf3853f9bc",
  measurementId: "G-EYDBR29NHH"
};

firebase.initializeApp(firebaseConfig);

var auth = firebase.auth();
var db = firebase.firestore();
var storage = firebase.storage ? firebase.storage() : null;
