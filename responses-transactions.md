# Beziehungen in der Tasklist

## 1. Fremdschlüssel und Relationsfelder

`creatorId` ist eine echte Spalte in der Tabelle `Task`. Sie enthält die ID des
Erstellers. `creator` ist dagegen ein Relationsfeld von Prisma. Damit kann ich
beim Laden einer Aufgabe auch die E-Mail ihres Erstellers abfragen. Auf der
Benutzerseite beschreibt `createdTasks` die dazugehörige Aufgabenliste.

## 2. Zwei Beziehungen zwischen denselben Tabellen

Ein Benutzer kann eine Aufgabe erstellen und ein anderer kann sie bearbeiten.
Beide Beziehungen verbinden `User` mit `Task`. Die Namen `CreatedTasks` und
`AssignedTasks` machen für Prisma eindeutig, welche Felder zusammengehören.
Ersteller und zugewiesener Benutzer bleiben dadurch unabhängig voneinander.

## 3. Optionale Beziehungen und Löschen

`assigneeId Int?` und `assignee User?` erlauben eine Aufgabe ohne Zuweisung.
Die Datenbank speichert dafür `NULL`. Wird ein zugewiesener Benutzer gelöscht,
setzt `onDelete: SetNull` diese Zuweisung zurück. Der Ersteller ist Pflicht;
`onDelete: Restrict` verhindert, dass sein Benutzer mit bestehenden Aufgaben
gelöscht wird.

Quelle: [Prisma ORM v6 – Relations](https://docs.prisma.io/docs/orm/v6/prisma-schema/data-model/relations).

## Transaktion bei der Registrierung

`$transaction` fasst Benutzer und Profilbild-Aufgabe zusammen. Erst wenn beide
gespeichert sind, übernimmt die Datenbank die Änderungen. Schlägt eine der
Operationen fehl, wird auch die andere rückgängig gemacht. Eine doppelte
E-Mail-Adresse hinterlässt deshalb keine zusätzliche Aufgabe.

Quelle: [Prisma ORM v6 – Transactions](https://docs.prisma.io/docs/orm/v6/prisma-client/queries/transactions).
