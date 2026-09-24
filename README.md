# InterVue — Setup Guide

## 1. Prerequisites

Install the following tools and verify each one with its check command:

| Tool | Required version | Check command | Notes |
|---|---|---|---|
| Git | Any | `git --version` | |
| JDK | **25** | `java -version` | `JAVA_HOME` must point to JDK 25 (e.g. Eclipse Temurin 25) |
| Node.js | **>= 20.9** | `node -v` | Comes with `npm` |
| Docker Desktop | Latest, with Compose v2 | `docker compose version` | On Windows, enable WSL 2 |

> You do **not** need to install Maven, MySQL or Redis. The project uses the Maven Wrapper (`mvnw`), and MySQL + Redis run in Docker.

## 2. Setup Steps

> Commands below are for **Git Bash / macOS / Linux**.
> On **PowerShell**, replace `./mvnw` with `.\mvnw.cmd`, `cp` with `copy`, and wrap `-D...` arguments in quotes (see Step 6).

### Step 1 — Clone the repository

```bash
git clone https://github.com/techx-team-project/intervue.git
cd intervue
```

### Step 2 — Install Git hooks

Run in the **project root**:

```bash
npm install
```

This installs [Lefthook](https://github.com/evilmartians/lefthook) and registers a pre-commit hook that auto-formats Java (Spotless) and TS/JS (Prettier) files on every commit.

### Step 3 — Create the `.env` file (root only)

The `.env` file is used by **Docker Compose** to create the MySQL database and user. It lives in the **project root only**.

```bash
cp .env.example .env
```

Edit `.env` so it looks like this:

```env
MYSQL_ROOT_PASSWORD=<your-root-password>
MYSQL_DATABASE=intervue_db
MYSQL_USER=intervue
MYSQL_PASSWORD=<your-db-password>
```

| Variable | Value |
|---|---|
| `MYSQL_DATABASE` | Keep `intervue_db` — this is the database name the backend uses in `application.yaml` |
| `MYSQL_USER` | Must be `intervue` — this is the username the backend uses in `application.yaml` |
| `MYSQL_ROOT_PASSWORD` | Any password you like (MySQL root account) |
| `MYSQL_PASSWORD` | Any password you like. **Remember it** — you will put the same value in `application-local.yml` in Step 5 |

> `.env` is git-ignored. Never commit it.

### Step 4 — Start MySQL and Redis

Open Docker Desktop first, then in the **project root**:

```bash
docker compose up -d
```

Wait until both containers are `healthy` (10–30 seconds on first run):

```bash
docker compose ps
```

Expected output:

```
NAME             IMAGE              STATUS              PORTS
intervue-mysql   mysql:8.4          Up ... (healthy)    0.0.0.0:3306->3306/tcp
intervue-redis   redis:7.4-alpine   Up ... (healthy)    0.0.0.0:6379->6379/tcp
```

| Service | Address | Credentials |
|---|---|---|
| MySQL | `localhost:3306` | Database, user and password from your `.env` |
| Redis | `localhost:6379` | No password |

Data is stored in the Docker volumes `mysql-data` and `redis-data`, so it survives container restarts.

### Step 5 — Create `application-local.yml` for secrets

The backend config is split into two files in `backend/src/main/resources/`:

| File | Committed? | Contains |
|---|---|---|
| `application.yaml` | Yes | All the main config (datasource URL, username, JWT expiration, issuer...). **Do not put secrets here.** |
| `application-local.yml` | **No** (git-ignored) | **Only the sensitive values**, which override the placeholders in `application.yaml` when the `local` profile is active |

Every developer must create `application-local.yml` manually. Create the file at:

```
backend/src/main/resources/application-local.yml
```

with the following content:

```yaml
spring:
  datasource:
    password: <your-db-password>

jwt:
  secret: <your-base64-secret>
```

| Key | Value |
|---|---|
| `spring.datasource.password` | Exactly the same as `MYSQL_PASSWORD` in the root `.env` (Step 3) |
| `jwt.secret` | A **Base64-encoded** key of at least 32 bytes (256 bits), used to sign JWT tokens. Generate one with the command below |

Generate a JWT secret:

```bash
# Git Bash / macOS / Linux
openssl rand -base64 48
```

```powershell
# PowerShell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

Copy the output and paste it as the value of `jwt.secret`.

> Everything else (database URL, username, JWT expiration...) comes from `application.yaml` — do not copy it into `application-local.yml`. If you add a new secret to the project later, put a placeholder in `application.yaml` and the real value in `application-local.yml`.

### Step 6 — Run the backend

From the `backend/` folder, start the app with the `local` profile:

```bash
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

```powershell
# PowerShell
cd backend
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"
```

- The first run downloads Maven and all dependencies, which can take a few minutes.
- On startup, **Flyway runs the migrations** in `src/main/resources/db/migration/` and creates all tables automatically. You do not need to create tables by hand.
- The backend runs at **http://localhost:8080**.

Verify it is running:

```bash
curl http://localhost:8080/ping
# {"status":true,"message":"Pong!"}
```

Optionally, test the register API:

```bash
curl -i -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","phone":"0912345678","password":"123456","confirmPassword":"123456"}'
```

A successful response returns an `accessToken` and the user in the body, plus a refresh token in the `Set-Cookie` header.

#### Running from an IDE

- **IntelliJ IDEA:** open `backend/` as a Maven project. Enable *Settings → Build, Execution, Deployment → Compiler → Annotation Processors → Enable annotation processing* (required for Lombok). Edit the run configuration for `IntervueApplication` and set *Active profiles* to `local`.
- **VS Code:** install *Extension Pack for Java*. Run `IntervueApplication` with this in `.vscode/launch.json`:
  ```json
  {
    "type": "java",
    "name": "IntervueApplication (local)",
    "request": "launch",
    "mainClass": "com.techx.intervue.IntervueApplication",
    "projectName": "intervue",
    "env": { "SPRING_PROFILES_ACTIVE": "local" }
  }
  ```

### Step 7 — Run the frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at **http://localhost:3000**.

## 3. Daily Run (after the first setup)

```bash
docker compose up -d                                                  # project root
cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=local  # terminal 1
cd frontend && npm run dev                                            # terminal 2
```

## 4. Useful Commands

```bash
# Docker (project root)
docker compose stop                 # stop containers, keep data
docker compose down                 # remove containers, keep data
docker compose down -v              # remove containers AND delete all DB/Redis data

# Open MySQL / Redis CLI
docker exec -it intervue-mysql mysql -u intervue -p intervue_db
docker exec -it intervue-redis redis-cli

# Backend (backend/)
./mvnw test                         # run tests
./mvnw spotless:apply               # format Java code
```

## 5. Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `Access denied for user 'intervue'@...` | Backend started without the `local` profile, **or** `spring.datasource.password` in `application-local.yml` does not match `MYSQL_PASSWORD` in `.env`, **or** `MYSQL_USER` in `.env` is not `intervue` | Run with `-Dspring-boot.run.profiles=local`, and check Step 3 and Step 5 values match |
| `Access denied` even though all values match | The MySQL volume was created earlier with a different user/password (MySQL only reads `.env` on first start) | Reset the volume: `docker compose down -v` then `docker compose up -d` (deletes local data) |
| `Communications link failure` / `Connection refused` on 3306 or 6379 | Docker is not running or containers are not healthy yet | Start Docker Desktop, run `docker compose ps` and wait for `healthy` |
| `Bind for 0.0.0.0:3306 failed: port is already allocated` | Another MySQL (XAMPP, MySQL Server...) is using port 3306 | Stop the other MySQL, or change the port mapping in `docker-compose.yml` (e.g. `"3307:3306"`) and update the port in `spring.datasource.url` in `application.yaml` locally (do not commit it) |
| `Port 8080 was already in use` | Another process is using port 8080 | Stop the process using port 8080 |
| `Illegal base64 character` / `WeakKeyException` on startup | `jwt.secret` is not valid Base64 or is shorter than 256 bits | Generate a new secret with the command in Step 5 |
| `invalid target release: 25` | `JAVA_HOME` points to an older JDK | Install JDK 25, update `JAVA_HOME`, reopen the terminal and check `java -version` |
| `./mvnw: Permission denied` | Missing execute permission (macOS/Linux) | `chmod +x backend/mvnw` |
| `/usr/bin/env: 'sh\r': No such file or directory` | `mvnw` was checked out with CRLF line endings | `git config core.autocrlf input`, then `git checkout -- backend/mvnw` |
| `FlywayValidateException: Migration checksum mismatch` | An already-applied migration file was edited | Revert the edit and add a new migration file instead. On local only, you can reset with `docker compose down -v` |
| Lombok `cannot find symbol` (getters/setters) in IDE | Annotation processing is disabled | Enable it (see *Running from an IDE*) |
| Code is not auto-formatted on commit | Git hooks not installed | Run `npm install` in the project root |

---

Feature specification: [docs/FEATURE_SPECIFICATION.md](./docs/FEATURE_SPECIFICATION.md)
