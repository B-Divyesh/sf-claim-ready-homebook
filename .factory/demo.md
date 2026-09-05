# Demo sandbox

Open `https://claim-ready-homebook.sociobot.in/demo`, or use `/demo` on a local server.

The demo starts with three sample records:

- a mirrorless camera with a photo, serial number, room, cabinet, and receipt;
- an oak dining table with a receipt and location;
- a cordless drill kit with a visible evidence gap.

The banner remains visible on every demo route. **Reset demo** restores those three records. **Start for real** clears the demo database and opens the normal inventory.

Demo records use the IndexedDB database `claim-ready-homebook-demo`. Normal records use `claim-ready-homebook`. Demo preferences use `demo:`-prefixed local-storage keys. The demo never reads or writes the normal inventory database.

All claim tests start at `/demo`. Run them with `npm run test:claims`.
