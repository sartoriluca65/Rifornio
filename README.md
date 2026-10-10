# Rifornio — prototipo web

Interfaccia responsive in italiano, senza build step. Apri `index.html` in un browser (per la geolocalizzazione, usa localhost/HTTPS). Garage, registrazioni e preferenze restano in `localStorage` sul dispositivo.

## Dati e limiti attuali

- Il garage parte con una Volkswagen Golf e una Fiat 500e dimostrative; lo storico parte con quattro registrazioni demo. Sono modificabili o rimovibili.
- Stazioni, prezzi, disponibilità, distanze e durate sono dimostrativi. I prezzi sono fittizi e non vengono aggiornati in automatico. Il badge DEMO e le note accanto ai prezzi lo indicano.
- La mappa visualizza punti demo su OpenStreetMap. Il tragitto è una stima in linea d'aria maggiorata del 25%, con velocità media convenzionale; traffico, strade e navigazione turn-by-turn non sono collegati.
- La localizzazione richiede il permesso del browser e ha un limite di attesa di 12 secondi. Se viene negata si può inserire un punto tramite latitudine e longitudine. Cambiare partenza ricalcola distanze e tragitto stimati. I punti demo sono limitati a Milano e dintorni: fuori da quest’area l’app mostra uno stato vuoto invece di lasciare risultati che sembrano pertinenti.
- I chilometraggi inseriti nei rifornimenti alimentano una media automatica dopo almeno due letture crescenti per lo stesso veicolo; la media sostituisce il consumo manuale nel confronto. Le registrazioni demo sono escluse dal calcolo. La formula è quantità dell’ultimo rifornimento ÷ km tra le due letture × 100; rifornimenti parziali possono alterare la stima.
- Le statistiche del grafico in questa prima versione sono illustrative; spesa, quantità e tabella usano le registrazioni locali. Le registrazioni demo iniziali vanno cancellate per avere un archivio composto solo dai dati personali.

## Attivare dati reali

Non esiste una fonte pubblica universale che fornisca prezzi verificati e disponibilità in tempo reale per tutte le alimentazioni e reti. Per l'uso reale serve un backend con connettori ai fornitori scelti, normalizzazione delle unità, provenienza e orario del dato, e aggiornamento programmato almeno ogni ora quando consentito dal fornitore. Non mettere chiavi o segreti nel JavaScript del browser.

Per collegare i servizi:

1. **Prezzi carburanti:** configurare un backend verso una fonte autorizzata (per esempio feed o API del gestore/aggregatore), restituendo stazioni, coordinate, alimentazioni, prezzo, valuta, timestamp, fonte e stato `verified` o `estimated`. Mostrare la fonte e il timestamp per ogni prezzo; se il feed è scaduto o fallisce, esporre chiaramente errore o indisponibilità invece di sostituirlo con un prezzo reale apparente.
2. **Ricarica:** integrare un aggregatore con protocollo/dati POI e, dove disponibile, session status/disponibilità (ad esempio un provider OCPI o API della rete). Le credenziali e i limiti commerciali dipendono dal provider e dal territorio.
3. **Mappa e percorso:** la mappa usa i tile OpenStreetMap pubblici per la demo. Prima della produzione scegliere un provider tile e rispettarne policy/quote. Collegare un routing engine (ad esempio OSRM ospitato, Valhalla o un provider commerciale) per distanza stradale, durata e geometria del percorso. Traffico live richiede un piano/provider con tale copertura.
4. **Aggiornamento:** pianificare l'aggiornamento nel backend ogni ora (non dal browser), rispettando limiti e licenze delle fonti. Salvare timestamp e stato del dato; aggiornare l'interfaccia con caricamento, errore e ultimo aggiornamento noto.

Il calcolo del costo usa `quantità × prezzo unitario` per l'acquisto e `consumo medio × distanza / 100 × prezzo unitario` per il tragitto. I kWh di viaggio restano separati dai kWh acquistati. Sono stime che non includono traffico, stile di guida, pedaggi, tariffe di sosta o condizioni del mezzo.

## Pubblicazione sul sito delle app

Sul sito GitHub Pages, la cartella viene pubblicata in `/rifornio/`. L'integrazione usa il contatore visite già presente sul sito e associa la pagina all'ID `rifornio`: il pannello `/admin/` mostra visitatori unici, attivi ora e visite giornaliere. Il tracker usa un identificativo casuale del browser e un segnale periodico; non legge il garage o lo storico. La configurazione analytics è caricata solo sul dominio di produzione, quindi il prototipo aperto in locale non invia conteggi.

Il tracker silenzia gli errori di rete; se il backend analytics del sito applica una whitelist agli ID app, va aggiunto `rifornio` anche alla funzione o policy Supabase che registra i segnali. In assenza di tale abilitazione, l'app resta funzionante ma non comparirà nei contatori.

## Backup, trasferimento e condivisione

Garage e storico restano nel browser. Il sito pubblicato e la copia aperta da `file://` hanno archivi separati per sicurezza del browser. Usa **Esporta dati** sulla versione che contiene il tuo archivio e poi **Importa archivio** sull'altra versione; il file JSON conserva veicoli e registrazioni. L'importazione chiede conferma e sostituisce l'archivio presente nel browser di destinazione. La condivisione apre un invito modificabile con il link pubblico dell'app.
