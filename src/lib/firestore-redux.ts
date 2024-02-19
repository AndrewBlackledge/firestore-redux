import type { AnyAction } from "@reduxjs/toolkit";
import type { FirebaseApp } from "firebase/app";
import {
  type DocumentChange,
  type DocumentData,
  type FirestoreError,
  addDoc,
  collection,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import type { Store } from "redux";

export function makeStorageForRedux(
  creator: string,
  app: FirebaseApp,
  path: string,
  store: Store,
) {
  const firestore = getFirestore(app);

  const dispatch = async (action: AnyAction) => {
    const actions = collection(firestore, path);
    console.log(`DISPATCH to ${path}: ${JSON.stringify(action)}`);
    return addDoc(actions, {
      ...action,
      timestamp: serverTimestamp(),
      creator,
    }).catch((message) => {
      console.error(message);
      throw message;
    });
  };

  const watch = (
    path: string,
    callback: (changes: DocumentChange<DocumentData>[]) => void,
    onError: (error: FirestoreError) => void,
  ) => {
    const actions = collection(firestore, path);
    return onSnapshot(
      query(actions, orderBy("timestamp")),
      { includeMetadataChanges: true },
      (querySnapshot) => {
        const changes = querySnapshot.docChanges();
        callback(changes);
      },
      (error) => {
        onError(error);
      },
    );
  };

  const listen = (path: string) => {
    return watch(
      path,
      (changes) => {
        for (const change of changes) {
          if (change.type === "added") {
            const doc = change.doc;
            const timestamp = doc.data().timestamp
              ? doc.data().timestamp.seconds
              : undefined;
            const data = { ...doc.data(), firebase_doc_id: doc.id, timestamp };
            store.dispatch(data as unknown as AnyAction);
          }
        }
      },
      (error) => {
        console.log("actions query failing: ");
        console.error(error);
      },
    );
  };

  return { dispatch, listen, watch };
}
