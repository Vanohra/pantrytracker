import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB0lS3ivsPqpHnpM2a_nmi7tDpvr5m1vko",
  authDomain: "pantry-tracker-6048d.firebaseapp.com",
  projectId: "pantry-tracker-6048d",
  storageBucket: "pantry-tracker-6048d.appspot.com",
  messagingSenderId: "1055351345968",
  appId: "1:1055351345968:web:ff932ceb4ab1890a242ef5",
  measurementId: "G-TJG1XL431J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

export { firestore };


