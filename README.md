# Production site

The site is hosted on Firebase:
https://norbi-allomasok-tavolsag.web.app/

Note that this is the only working address, as the other default Firebase hosting address hasn't been allowed to use the Google Maps API.

# Running the app locally

Clone the repo and run `npm install`

Copy the `.env.example` file to `.env`: 

```shell
  cp .env.example .env
```

Add your Google Maps API key to `.env` (it will work without it, too, though)

Run `npm run dev`

