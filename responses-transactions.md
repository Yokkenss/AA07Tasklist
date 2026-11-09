# beziehungen in der tasklist

## 1. fremdschlüssel

eine aufgabe speichert die id ihres erstellers. diese id verweist auf einen benutzer und heißt fremdschlüssel. so kann ich zu einer aufgabe den passenden benutzer laden, zum beispiel seine e-mail-adresse. die datenbank verhindert dabei, dass eine aufgabe auf einen benutzer verweist, den es nicht gibt.

## 2. zwei beziehungen

eine aufgabe hat einen ersteller und kann einem anderen benutzer zugewiesen sein. dafür gibt es zwei beziehungen mit verschiedenen namen. so weiss prisma, welche verbindung gemeint ist. ein benutzer kann mehrere aufgaben erstellen und mehrere aufgaben zugewiesen bekommen. wenn ich die zuweisung ändere, bleibt der ersteller gleich.

## 3. optionale zuweisung

eine neue aufgabe ist noch niemandem zugewiesen. die zuweisung darf deshalb leer sein und wird in der datenbank als null gespeichert. in prisma zeigt ein fragezeichen hinter dem typ, dass ein feld optional ist. später kann ich einen benutzer zuweisen oder die zuweisung wieder entfernen. der ersteller muss dagegen immer vorhanden sein.

## transaktion

bei der registrierung werden der benutzer und seine profilbild-aufgabe in einer transaktion zusammen gespeichert. die aufgabe wird dem neuen benutzer zugewiesen und ist in zwei tagen fällig. erst wenn beide gespeichert wurden, werden die änderungen übernommen. wenn eine der beiden speicherungen fehlschlägt, wird beides rückgängig gemacht. so bleibt kein neuer benutzer ohne seine aufgabe zurück.
