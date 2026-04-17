# Copy-Paste Regeln

## quanturion-calculator – Firestore
```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }

    match /publicSettings/{document=**} {
      allow read: if true;
      allow write: if false;
    }

    match /leadBackups/{document=**} {
      allow read, write: if false;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## quanturion-calculator – Storage
```txt
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /public/{allPaths=**} {
      allow read: if true;
      allow write: if false;
    }
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

## quanturion-admin – Firestore
```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null && request.auth.token.admin == true;
    }

    match /settings/{document=**} {
      allow read: if isAdmin();
      allow write: if isAdmin();
    }

    match /leads/{leadId} {
      allow read: if isAdmin();
      allow create, update, delete: if false;
    }

    match /leadEvents/{eventId} {
      allow read: if isAdmin();
      allow create, update, delete: if false;
    }

    match /partnerDispatches/{dispatchId} {
      allow read: if isAdmin();
      allow create, update, delete: if false;
    }

    match /idempotencyKeys/{key} {
      allow read: if isAdmin();
      allow write: if false;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## quanturion-admin – Storage
```txt
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```
