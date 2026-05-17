# Cinérecom React

React/Vite version of the movie recommendation frontend.

## Run

```bash
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5500
```

## Backend URL

Create `.env` from `.env.example`:

```bash
copy .env.example .env
```

Then set:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

The React app calls these backend endpoints:

- `GET /movies?limit=&offset=`
- `POST /recommend/new-user`
- `POST /recommend/old-user`
