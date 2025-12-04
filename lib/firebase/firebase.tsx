// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDL1Myv0oWQf93iEXXJ3Dg_553KxRJA3JM",
  authDomain: "dashboard-ta-32571.firebaseapp.com",
  databaseURL: "https://dashboard-ta-32571-default-rtdb.firebaseio.com",
  projectId: "dashboard-ta-32571",
  storageBucket: "dashboard-ta-32571.firebasestorage.app",
  messagingSenderId: "792268860039",
  appId: "1:792268860039:web:af586246fce6447e8da622",
  measurementId: "G-016YNNH0HW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);