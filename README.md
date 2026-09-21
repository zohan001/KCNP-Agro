# Verdant Agro - Full Stack Application
# ============================================
# Climate Smart Agriculture & Trade Initiative
# Promoting sustainable economic growth through
# climate-smart agricultural practices and
# equitable trade partnerships.
# ============================================

## 🚀 Tech Stack

- **Frontend:** HTML5, Tailwind CSS, Vanilla JavaScript (no frameworks)
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (via Mongoose ODM) with managed cloud hosting
- **Security:** Helmet, CORS, express-rate-limit, server-side validation
- **Deployment:** Docker Compose (local), Render (production via Blueprint)

## 📁 Project Structure

```
climate-smart-ag/
├── public/                    # Frontend static files
│   └── index.html            # Main single-page application
├── server/                    # Backend code
│   ├── index.js              # Main server entry point
│   ├── app.js                # Express app factory (testable)
│   ├── config/               # Configuration files
│   │   └── index.js
│   ├── controllers/          # Request handlers
│   │   ├── contactController.js
│   │   └── newsletterController.js
│   ├── db/                   # Database layer
│   │   └── database.js       # MongoDB connection (Mongoose)
│   ├── middleware/           # Custom middleware
│   │   └── validation.js
│   ├── models/               # Mongoose data models
│   │   ├── ContactMessage.js
│   │   ├── NewsletterSubscriber.js
│   │   └── AuditLog.js
│   └── routes/               # API route definitions
│       └── api.js
├── scripts/                  # Utility scripts
│   ├── init-db.js           # Verify DB connection & indexes
│   └── test-api.js          # API integration tests
├── data/                     # SQLite database files (generated)
├── index.html                 # Development copy of frontend
├── .env.example               # Environment variable template
├── .gitignore                 # Git ignore rules
├── Dockerfile                 # Container build file
├── docker-compose.yml         # Container orchestration
├── nginx.conf                 # Reverse proxy config
└── package.json               # Node.js dependencies & scripts
```

## 🛠️ Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- (Optional) Docker & Docker Compose for containerized deployment

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables (adjust as needed)
cp .env.example .env
#    Set MONGO_URI to your MongoDB connection string.
#    Local example: mongodb://127.0.0.1:27017/verdant
#    Atlas example:  mongodb+srv://<user>:<password>@cluster.mongodb.net/verdant

# 3. Verify the database connection
npm run init-db

# 4. Start in development mode (with auto-reload)
npm run dev

# OR start in production mode
npm start
```

The application will be available at `http://localhost:3000`.

### Seeding Demo Content

```bash
npm run seed
```

Loads starter content (knowledge-base articles, a quiz, a sample listing)
and three demo accounts. After login you land on a role-based **Dashboard**:
farmers post/manage their own listings, traders browse and contact sellers,
and the live stats on the homepage reflect real database counts.

| Role   | Email                | Password    |
|--------|----------------------|-------------|
| Admin  | admin@kcnpagro.org   | adminpass123 |
| Farmer | demofarmer@gmail.com | farmer123   |
| Trader | demotrader@gmail.com | trader123   |

> **Note:** This project targets **MongoDB 4.4+**. MongoDB 5.0+ requires a
> CPU with AVX support and will fail to start on older hardware. When using
> Docker on such machines, use `mongo:4.4` (the `docker-compose.yml` already
> does).

### Running Tests

```bash
# Requires a running MongoDB (e.g. docker run -p 27017:27017 mongo:4.4)
npm test
```

The test script starts the server on a test port, verifies every API
endpoint (health, contact, newsletter, auth, products, articles, quizzes,
404, static pages), and exits cleanly.

## 🔌 API Endpoints

| Method   | Endpoint              | Description                                   |
|----------|-----------------------|-----------------------------------------------|
| GET      | `/api/health`         | Service health check                          |
| POST     | `/api/contact`        | Submit a contact message                      |
| GET      | `/api/contact`        | Get all contact messages (admin)              |
| POST     | `/api/newsletter`     | Subscribe to newsletter                       |
| GET      | `/api/newsletter`     | Get all subscribers (admin)                   |
| POST     | `/api/auth/register`  | Register a new user (returns JWT)             |
| POST     | `/api/auth/login`     | Login with email/password (returns JWT)       |
| GET      | `/api/auth/profile`   | Get the authenticated user's profile          |
| POST     | `/api/products`       | Create a marketplace listing                  |
| GET      | `/api/products`       | List listings (category/search/pagination)    |
| GET      | `/api/products/:id`   | Get a single listing                          |
| PUT      | `/api/products/:id`   | Update a listing (owner/admin)                |
| DELETE   | `/api/products/:id`   | Delete a listing (owner/admin)                |
| POST     | `/api/articles`       | Create a knowledge-base article (admin)       |
| GET      | `/api/articles`       | List published articles                       |
| GET      | `/api/articles/:id`   | Get single article (by id or slug)            |
| POST     | `/api/quizzes`        | Create a quiz (admin)                         |
| GET      | `/api/quizzes`        | List published quizzes                        |
| GET      | `/api/quizzes/:id`    | Get a quiz (correct answers hidden)           |
| POST     | `/api/quizzes/:id/submit` | Submit answers and get a score            |
| PUT/DELETE| `/api/articles/:id`, `/api/quizzes/:id` | Admin update/delete        |

### Example: Contact Form Submission

```json
// POST /api/contact
{
  "name": "John Doe",
  "email": "john@example.com",
  "organization": "Green Farms",
  "subject": "partnership",
  "message": "I'd like to discuss a partnership opportunity."
}
```

### Example: User Registration

```json
// POST /api/auth/register
{
  "name": "Jane Farmer",
  "email": "jane@example.com",
  "password": "secret123"
}
```

### Example: Quiz Submission

```json
// POST /api/quizzes/:id/submit
{
  "answers": [1, 0, 2]
}
```

Authenticated endpoints require an `Authorization: Bearer <token>` header obtained
from the register/login responses.

## 🐳 Docker Deployment (Local)

```bash
# Start the full stack (web + MongoDB) with Docker Compose
docker-compose up --build -d

# Check logs
docker-compose logs -f

# Stop the services
docker-compose down
```

To build a standalone image:

```bash
docker build -t verdant-agro .
docker run -p 3000:3000 -e MONGO_URI=mongodb://host.docker.internal:27017/verdant verdant-agro
```

## ☁️ Production Deployment on Render

The app uses **MongoDB**, which Render does not provide as a managed database
service. So the database is hosted externally (e.g., **MongoDB Atlas** free
tier) and the connection string (`MONGO_URI`) is provided to the Render web
service as a secret during setup. The included `render.yaml` Blueprint wires
this up with `sync: false` so you're prompted for the value.

### 1. Create a free MongoDB Atlas database

1. Sign up at [mongodb.com/atlas](https://www.mongodb.com/atlas) (free tier).
2. Create a **free M0 cluster**.
3. Under **Database Access**, create a database user with read/write rights.
4. Under **Network Access**, allow access from anywhere (`0.0.0.0/0`)
   (or Render's [static IPs](https://render.com/docs/static-outbound-ip-addresses) if on a paid plan).
5. Click **Connect** → **Drivers** → copy the connection string:
   `mongodb+srv://<user>:<password>@cluster.mongodb.net/` — append the DB
   name, e.g. `...mongodb.net/verdant`.

### 2. Quick Deploy (Blueprint)

1. Create a **public GitHub repository** and push this project (see below).
2. Sign up/log in at [render.com](https://render.com).
3. From the dashboard, click **New** → **Blueprint**.
4. Select your GitHub repository.
5. When prompted, **paste your `MONGO_URI`** (the secret env var).
6. Review the `verdant-agro` web service and click **Apply**.
7. Render builds and deploys automatically. The health check runs against `/api/health`.

### Pushing to GitHub

```bash
# From the project root
git init
git add .
git commit -m "Initial commit: Verdant Agro full-stack app"
git branch -M main
# Create a repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/verdant-agro.git
git push -u origin main
```

### Manual Deploy (if you prefer the dashboard)

1. **Database:** Host MongoDB externally (e.g., MongoDB Atlas — see step 1 above).
2. **Web Service:** Create a **Web Service**, connect your repo.
   - **Runtime:** Node
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Health check path:** `/api/health`
   - **Environment variable:** `MONGO_URI` = your MongoDB connection string (from Atlas).

> **Note:** The free Render plan may suspend idle web services, but your
> MongoDB data lives in Atlas and is fully persistent regardless.

## 🔒 Security Features

- **Helmet** - Sets security-related HTTP headers
- **CORS** - Configurable cross-origin resource sharing
- **Rate Limiting** - Prevents abuse of API endpoints
- **Input Validation** - Server-side validation of all user input
- **NoSQL Injection Prevention** - Mongoose schema validation & sanitization
- **Error Sanitization** - No internals leaked in production errors
- **Non-root Container User** - Docker container runs as `node` user

## ♿ Accessibility

- Semantic HTML5 tags (`<header>`, `<main>`, `<footer>`, `<nav>`, `<section>`, `<article>`)
- ARIA labels on interactive elements
- Skip-to-content link
- Proper form labels
- WCAG-compliant color contrast
- Keyboard navigable

## 📄 License

MIT

## 👥 Author

Verdant Agro Team

---

© 2026 Verdant Agro. All rights reserved.
