// Run this script with: node create-admin.js
// Make sure you have firebase-admin installed: npm install firebase-admin

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // You need to download this from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function createAdminUser() {
  try {
    console.log('Creating admin user...');
    
    // Create the user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: 'admin@admin.com',
      password: '123456',
      emailVerified: true,
    });

    console.log('✓ User created in Auth:', userRecord.uid);

    // Set admin role in Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: 'admin@admin.com',
      role: 'admin',
      isActive: true,
      firstName: 'Admin',
      lastName: 'User',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('✓ Admin role set in Firestore');
    console.log('\n✅ Admin user created successfully!');
    console.log('Email: admin@admin.com');
    console.log('Password: 123456');
    console.log('\nPlease change this password after logging in!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createAdminUser();
