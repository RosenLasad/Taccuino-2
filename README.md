# Taccuino - fase 3

Questa versione aggiunge:
- Login/Logout con Netlify Identity
- sincronizzazione note per account
- cache locale guest e cache locale per utente loggato
- merge automatico tra note locali e note cloud al primo login

## Struttura nuova
- `js/auth.js` -> integrazione Netlify Identity
- `js/cloud.js` -> sync con Function Netlify
- `netlify/functions/user-notes.js` -> API server-side per leggere/scrivere le note dell'utente
- `package.json` -> dipendenze per Functions / Blobs / Identity
- `netlify.toml` -> cartella functions e cache service worker

## Nota importante
La parte login/sync non funziona aprendo solo `index.html` con doppio clic.
Per provarla davvero usa:
1. deploy su Netlify
2. oppure `netlify dev` in locale dopo aver collegato il sito
