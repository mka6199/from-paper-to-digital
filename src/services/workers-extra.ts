import { db } from '../../firebase'; 
import { doc, updateDoc } from 'firebase/firestore';

export async function fireWorker(workerId: string) {
  const ref = doc(db, 'workers', workerId);
  await updateDoc(ref, {
    status: 'Fired',
    terminationDate: Date.now(),
    updatedAt: Date.now(),
  });
}
