# Docker: Local Run

## Start

```bash
docker-compose up -d --build
```

Site will be available at:

- http://localhost:8080

## Stop

```bash
docker-compose down
```

## Logs

```bash
docker-compose logs -f web
docker-compose logs -f php
```

## Notes

- `api/lead.php` skips real e-mail sending on `localhost` and returns `ok` with a warning.
- In production behavior remains unchanged: API attempts to send real e-mail via `mail()`.
