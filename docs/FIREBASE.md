# Firebase-Plan

Firebase ist noch nicht verbunden. Aktuell bleiben Daten im Browser.

## Dienste

- Firebase Authentication für Benutzerlogin
- Cloud Firestore für Inventur und Rezepte
- Firebase Storage für Fotos
- App Check gegen automatisierten Missbrauch

## Empfohlenes Datenmodell

```text
workspaces/{workspaceId}
workspaces/{workspaceId}/members/{uid}
workspaces/{workspaceId}/recipes/{recipeId}
workspaces/{workspaceId}/inventories/current
```

Fotos:

```text
workspaces/{workspaceId}/recipes/{recipeId}/{photoId}.jpg
```

## Nächster Schritt

1. Firebase-Projekt erstellen.
2. Web-App registrieren.
3. Authentication-Anbieter wählen.
4. Firebase-Konfiguration bereitstellen.
5. Firestore- und Storage-Regeln gemeinsam einrichten.
6. `lib/client-storage.ts` durch Firebase-Adapter ergänzen.

Firebase-Web-Konfiguration ist öffentlich. Sicherheit kommt durch Authentication, Firestore Rules und Storage Rules.

