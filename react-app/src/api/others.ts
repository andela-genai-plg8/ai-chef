import { getFirestore, doc, getDoc } from "firebase/firestore";
import { AppUserData } from "shared-types";

/**
 * Update a recipe document by id with the provided recipe payload.
 * The function strips the id field from the payload (if present) and updates
 * the Firestore document at `recipes/{id}`.
 */
export async function getUser(id: string): Promise<AppUserData | null> {
  const db = getFirestore();
  const recipeRef = doc(db, 'users', id);

  const docSnap = await getDoc(recipeRef);
  if (!docSnap.exists()) {
    console.log(`User with id ${id} not found`);
    return null;
  }

  const data = docSnap.data();
  return { id: docSnap.id, ...data } as AppUserData;
}
