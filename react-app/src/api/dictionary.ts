import { collection, getDocs, getFirestore } from "firebase/firestore";
import { Word } from "shared-types";


interface FindRecipeParams {
  ingredients: string[];
}


export async function getDictionary(): Promise<{ [word: string]: number }> {
  const db = getFirestore();
  const recipesCollection = collection(db, "dictionary");
  const snapshot = await getDocs(recipesCollection);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return { word: data.word, value: data.value } as Word;
  }).reduce((acc, curr) => ({ ...acc, [curr.word]: curr.value }), {});
}
