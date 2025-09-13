import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { connectFirestoreEmulator } from "firebase/firestore";

// Extend ImportMeta to include env property for Vite
interface ImportMetaEnv {
  VITE_FIREBASE_API_KEY: string;
  VITE_FIREBASE_AUTH_DOMAIN: string;
  VITE_FIREBASE_PROJECT_ID: string;
  VITE_FIREBASE_STORAGE_BUCKET: string;
  VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  VITE_FIREBASE_APP_ID: string;
}

declare global {
  interface ImportMeta {
    env: ImportMetaEnv;
  }
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (!(getApps().length > 0)) {
  initializeApp(firebaseConfig);

  // add a message message to the user collection in firestore
  const db = getFirestore();

  // if (location.hostname === "localhost") {
  //   connectFirestoreEmulator(db, "localhost", 8080);
  // }
  
  // const recipeCollection = collection(db, "recipes");

  // // get a collection of recipes sorted by the slug and delete one of every duplicate slug
  // onSnapshot(recipeCollection, (snapshot) => {
  //   const seenSlugs = new Set();
  //   snapshot.docs.forEach((docSnap) => {
  //     const recipe = docSnap.data();
  //     const slug = recipe.name.toLowerCase().replace(/\s+/g, "-");
  //     const recipeDocRef = doc(recipeCollection, docSnap.id);

  //     if (seenSlugs.has(slug)) {
  //       // If the slug is a duplicate, delete the document
  //       console.log(`Deleting duplicate recipe: ${recipe.name}`);
  //       deleteDoc(recipeDocRef);
  //     } else {
  //       seenSlugs.add(slug);
  //     }
  //     updateDoc(recipeDocRef, { slug });
  //   });
  // });

  // // for every recipe in the collection, update it by adding a slug property formed by the lowercased name
  // onSnapshot(recipeCollection, (snapshot) => {
  //   snapshot.docs.forEach((docSnap) => {
  //     const recipe = docSnap.data();
  //     const slug = recipe.name.toLowerCase().replace(/\s+/g, "-");
  //     const ingredientList = recipe.ingredients
  //       .map((ingredient: { name: string }) => ingredient.name.toLowerCase().replace(/\s+/g, "-"))
  //       .filter((i: string) => i.length > 0);
  //     const recipeDocRef = doc(recipeCollection, docSnap.id);
  //     updateDoc(recipeDocRef, { slug, ingredientList });
  //   });
  // });

  // recipeCollection.
  //  [
  //    {
  //        "name": "Savory Slow Roasted Tomatoes with Filet of Anchovy",
  //        "image": "https://img.spoonacular.com/recipes/631757-312x231.jpg",
  //        "ingredients": [
  //            {
  //                "name": "anchovy filets",
  //                "quantity": "8"
  //            }
  //        ],
  //        "instructions": [
  //            {
  //                "step": 1,
  //                "instruction": "Slow roast tomatoes with anchovy filets.",
  //                "duration": 1200
  //            }
  //        ]
  //    },
  //  ].map((recipe) => addDoc(recipeCollection, recipe));
}
