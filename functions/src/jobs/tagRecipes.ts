// import { scheduler } from "firebase-functions";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { ChefFactory } from "../providers/ChefFactory";
import { Recipe } from "shared-types";

async function tag() {
  if (!admin.apps.length) {
    const usingEmulator = !!process.env.FIRESTORE_EMULATOR_HOST || !!process.env.FUNCTIONS_EMULATOR;
    if (usingEmulator) {
      admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-project' });
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: process.env.DATABASE_URL,
      });
    }
  }

  // get 30 recipes whose tagged property is either missing or set to false
  const recipesRef = admin.firestore().collection("recipes");

  // get recipes that either don't have a tag or have a tag set to false
  const snapshot = await recipesRef.get();//.where("tagged", "!=", true).limit(30).get();
  const recipes = snapshot.docs.map((doc) => ({ ...doc.data(), ref: doc.ref })).filter(r => r.ref) as (Recipe & { ref: FirebaseFirestore.DocumentReference })[];

  if (recipes.length === 0) {
    console.log("No recipes found to tag.");
    return;
  }

  // load the tag dictionary
  const tagsSnapshot = await admin.firestore().collection("dictionary").get();
  const words = { ...tagsSnapshot.docs.map((doc) => doc.data()).reduce((acc, curr) => ({ ...acc, [curr.word]: { value: curr.value, id: curr.id } }), {}) };

  // get the combined ingredientList list of all recipes (skip missing lists)
  const ingredientLists = [...new Set(recipes.map((r) => r.ingredientList || []).flat())];
  console.log("Combined ingredient list:", ingredientLists);

  // use AI to get the unique list of words representing ingredients
  const chef = await ChefFactory.getChef({ name: "Andel", specifiedModel: process.env.DEFAULT_MODEL || "gpt-4" });

  const ingredientNames: { [key: string]: { word: string; plural: string; variations: string[] } } = await chef.getIngredientNames(ingredientLists);
  const newWords: { word: string; value: number }[] = [];
  let nextId: number = Object.values(words).reduce((maxValue, current) => Math.max(maxValue, current.value), 0) + 1;

  const ingredientWordsMap: { [name: string]: number } = {};
  Object.keys(ingredientNames).forEach((ingredientKey: string) => {
    const ingredientName = ingredientNames[ingredientKey];

    let singularWord = words[ingredientName.word];
    let pluralWord = words[ingredientName.plural];

    // ensure the singular word exists in the dictionary
    if (!singularWord) {
      newWords.push({ word: ingredientName.word, value: nextId });
      words[ingredientName.word] = { value: nextId, id: "" };

      if (!pluralWord) {
        newWords.push({ word: ingredientName.plural, value: nextId });
        words[ingredientName.plural] = { value: nextId, id: "" };
        pluralWord = nextId
      }

      singularWord = nextId;
      nextId++;
    }

    // ensure the plural word exists in the dictionary
    if (!pluralWord) {
      newWords.push({ word: ingredientName.plural, value: nextId });
      words[ingredientName.plural] = { value: nextId, id: "" };

      pluralWord = nextId;
      nextId++;
    }
    ingredientWordsMap[ingredientKey] = words[ingredientName.plural].value;
    ingredientWordsMap[ingredientName.word] = words[ingredientName.plural].value;
    ingredientWordsMap[ingredientName.plural] = words[ingredientName.plural].value;

    // ensure that the variations existing in the dictionary are updated
    Object.keys(ingredientName.variations).forEach((word) => {
      if (!words[word]) {
        newWords.push({ word, value: nextId });
        words[word] = { value: nextId, id: "" };
        nextId++;
      }
      ingredientWordsMap[word] = words[ingredientName.plural].value;
    });


  });

  // insert the new words into firestore
  if (newWords.length > 0) {
    const batch = admin.firestore().batch();
    newWords.forEach((word) => {
      const docRef = admin.firestore().collection("dictionary").doc();
      batch.set(docRef, { ...word, id: docRef.id });
    });
    await batch.commit();
  }

  // for each recipe
  // - create a tags array
  // - for each ingredient in the ingredientList, find the corresponding word in the dictionary and add its id to the tags array
  // - update the recipe with the new tags array and set tagged to true
  // const batch = admin.firestore().batch();

  // const calculatedEmbeddings = await chef.calculateEmbedding(recipes);
  // await chef.storeEmbeddings(recipes.map((r, i) => ({ ...r, vector: calculatedEmbeddings[i][2] })));

  // recipes.forEach((recipe, index) => {

  //   // ensure ingredientList is an array before joining
  //   const ingredientListArr = Array.isArray(recipe.ingredientList) ? recipe.ingredientList : [];
  //   const ingredientListString = ingredientListArr.join(", ").toLowerCase();

  //   const tagsSet = new Set<number>();
  //   Object.keys(ingredientWordsMap).forEach((ingredientKey) => {
  //     if (ingredientListString.includes(String(ingredientKey).toLowerCase())) {
  //       tagsSet.add(ingredientWordsMap[ingredientKey]);
  //     }
  //   });

  //   const tags = Array.from(tagsSet);
  //   batch.update(recipe.ref, { tags, tagged: true });
  // });
  // await batch.commit();
}

// Runs every 5 minutes
export const tagRecipes = functions.scheduler.onSchedule("every 5 minutes", async (context) => {
  await tag();
});

export const cleanRecipes = functions.https.onRequest(
  { timeoutSeconds: 540 }, // max 540 seconds (9 minutes),
  async (req, res) => {
    await tag();
  }
);
