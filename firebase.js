/* firebase.js — Firebase init (replace config with your project values) */
var firebaseConfig = {
  apiKey: "AIzaSyD_REPLACE_WITH_YOUR_KEY",
  authDomain: "ddlist.firebaseapp.com",
  projectId: "ddlist",
  storageBucket: "ddlist.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000"
};

firebase.initializeApp(firebaseConfig);

var auth = firebase.auth();
var db = firebase.firestore();
var storage = firebase.storage ? firebase.storage() : null;
