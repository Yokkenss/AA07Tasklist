# Tasklist v3

Express, EJS, Prisma 6 und MySQL/MariaDB. Die Oberfläche bleibt auf Deutsch.
Ein Login und ein Datei-Upload sind nicht Teil dieser Version.

## Start mit XAMPP

1. MySQL in XAMPP starten und die Datenbank `tasklist` anlegen.
2. `.env.example` als `.env` kopieren und die Verbindung bei Bedarf anpassen.
3. Im Projektordner ausführen:

```powershell
npm.cmd install
npx.cmd prisma generate
npx.cmd prisma migrate deploy
npx.cmd prisma db seed
npm.cmd start
```

Danach: <http://localhost:3000>.

## Prüfen

```powershell
npm.cmd test
```

Der Test legt eine eigene Datenbank `tasklist_test_...` an und entfernt sie am
Ende. Der MySQL-Benutzer braucht dafür Rechte zum Erstellen und Löschen einer
Datenbank sowie für einen Test-Trigger. Die eigentliche `tasklist` wird nicht
verändert. Geprüft werden Migration mit v2-Daten, Seed, Registrierung mit
Rollback, Rollen, Zuweisung und die vorhandene Aufgabenverwaltung.

Lokal geprüft am 09.11.2026: Migration und Seed wurden in der XAMPP-Datenbank
ausgeführt. Die vorhandene v2-Aufgabe blieb unverändert erhalten und erhielt
den Admin als Ersteller. Der Integrationstest prüft den Rollback zusätzlich
mit einem absichtlich ausgelösten Datenbankfehler.

`npm audit fix` aktualisiert die kompatiblen Express-Abhängigkeiten. Der Audit
meldet weiterhin eine bekannte Schwachstelle in `deepmerge-ts`, die auch bei
`@prisma/config` und `prisma` gezählt wird (drei High-Meldungen). Die angebotene
automatische Lösung verlangt Prisma 7. Die Anwendung bleibt für diese Abgabe
bei Prisma 6; ein Versionswechsel wurde nicht erzwungen.

## Was wo liegt

- `prisma/schema.prisma`: Benutzer, Aufgaben und ihre Beziehungen.
- `prisma/migrations`: Änderungen für die Datenbank, einschließlich alter v2-Aufgaben.
- `prisma/client.js`: eine gemeinsame Datenbankverbindung.
- `services/userService.js`: Benutzer speichern und Passwort mit bcrypt hashen.
- `prisma/seed.js`: Admin anlegen oder aktualisieren und den Hash überprüfen.
- `controllers/userController.js`: Registrierung, Benutzerliste und Rollen.
- `controllers/taskController.js`: Aufgaben und Zuweisungen.
- `routes`: URLs der Anwendung.
- `views`: EJS-Seiten, `public/css/styles.css`: Gestaltung.
- `model.png`: Skizze des Datenmodells.
- `responses-transactions.md`: Erklärung der Beziehungen und der Transaktion.

## Admin und vorhandene Aufgaben

Die Migration legt `admin@tasklist.local` mit einem Hash eines zufälligen
Passworts an. So können bestehende Aufgaben sofort einen gültigen Ersteller
erhalten, ohne dass sie gelöscht werden. Die Zuweisung bleibt leer.
Danach speichert der Seed denselben Admin über den Benutzerservice neu.
Er nimmt `ADMIN_PASSWORD` aus der Umgebung oder erzeugt ein zufälliges Passwort.
Ein wiederholter Seed erstellt keinen zweiten Admin, setzt aber dessen Passwort
und Rolle erneut. Es gibt noch keinen Login; das Passwort wird nicht ausgegeben.

Normale neue Aufgaben sind zunächst nicht zugewiesen. Als Ersteller wird der
erste Benutzer mit Rolle `admin` verwendet. Gibt es keinen Admin mehr, erscheint
eine verständliche Fehlermeldung; über die Benutzerliste kann die Rolle wieder
gesetzt werden. Alternativ stellt der Seed den ursprünglichen Admin wieder her.

Bei der Registrierung werden Benutzer und Aufgabe `Profilbild hochladen` in
einer Transaktion gespeichert. Der Admin ist Ersteller, der neue Benutzer ist
zugewiesen. Der Termin liegt zwei Kalendertage nach der Registrierung, nach
Schweizer Zeit. Das Feld `profileImage` ist optional und anfangs leer.
