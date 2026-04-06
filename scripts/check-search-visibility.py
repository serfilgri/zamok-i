#!/usr/bin/env python3
import argparse
import base64
import csv
import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_QUERIES_FILE = ROOT / "Doc" / "keywords_data.txt"
DEFAULT_REPORT_FILE = ROOT / "Doc" / "search-visibility-report.csv"
DEFAULT_HISTORY_FILE = ROOT / "Doc" / "search-visibility-history.csv"
TOKEN_URL = "https://oauth2.googleapis.com/token"
SEARCH_ANALYTICS_BASE = "https://www.googleapis.com/webmasters/v3/sites/"
SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]


def parse_args():
    today = date.today()
    default_end = today - timedelta(days=3)
    default_start = default_end - timedelta(days=27)

    parser = argparse.ArgumentParser(
        description="Check site visibility for a list of search queries via Google Search Console API."
    )
    parser.add_argument(
        "--site-url",
        default="https://zamok-i.ru/",
        help="Search Console property URL. For URL-prefix properties keep the trailing slash.",
    )
    parser.add_argument(
        "--queries-file",
        default=str(DEFAULT_QUERIES_FILE),
        help="Path to a text/tsv/csv file with search queries in the first column.",
    )
    parser.add_argument(
        "--output",
        default=str(DEFAULT_REPORT_FILE),
        help="Path to the report CSV file.",
    )
    parser.add_argument(
        "--history-output",
        default=str(DEFAULT_HISTORY_FILE),
        help="Path to the history CSV file.",
    )
    parser.add_argument(
        "--credentials",
        default=os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", ""),
        help="Path to Google service account JSON. Falls back to GOOGLE_APPLICATION_CREDENTIALS.",
    )
    parser.add_argument("--start-date", default=default_start.isoformat(), help="YYYY-MM-DD")
    parser.add_argument("--end-date", default=default_end.isoformat(), help="YYYY-MM-DD")
    parser.add_argument(
        "--limit",
        type=int,
        default=50,
        help="How many queries to load from the input file.",
    )
    parser.add_argument(
        "--country",
        default="",
        help="Optional ISO-3166-1 alpha-3 country code filter, for example RUS.",
    )
    parser.add_argument(
        "--device",
        default="",
        help="Optional device filter: DESKTOP, MOBILE or TABLET.",
    )
    parser.add_argument(
        "--result-type",
        default="web",
        help="Search Console result type, for example web, image or news.",
    )
    parser.add_argument(
        "--pause-ms",
        type=int,
        default=150,
        help="Pause between API calls in milliseconds.",
    )
    return parser.parse_args()


def load_queries(file_path, limit):
    queries = []
    with open(file_path, "r", encoding="utf8") as handle:
      # The file may be txt/tsv/csv, so we only trust the first text cell.
        for raw_line in handle:
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue

            if "\t" in line:
                query = line.split("\t", 1)[0].strip()
            elif "," in line:
                query = line.split(",", 1)[0].strip().strip('"')
            else:
                query = line

            if query and query not in queries:
                queries.append(query)

            if limit and len(queries) >= limit:
                break
    return queries


def base64url_encode(data):
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def sign_rs256(message_bytes, private_key_pem):
    with tempfile.NamedTemporaryFile("w", encoding="utf8", delete=False) as key_file:
        key_file.write(private_key_pem)
        key_path = key_file.name

    try:
        result = subprocess.run(
            ["openssl", "dgst", "-sha256", "-sign", key_path, "-binary"],
            input=message_bytes,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True,
        )
        return result.stdout
    finally:
        try:
            os.unlink(key_path)
        except FileNotFoundError:
            pass


def build_service_account_jwt(credentials):
    now = int(time.time())
    header = {
        "alg": "RS256",
        "typ": "JWT",
        "kid": credentials["private_key_id"],
    }
    payload = {
        "iss": credentials["client_email"],
        "scope": " ".join(SCOPES),
        "aud": TOKEN_URL,
        "exp": now + 3600,
        "iat": now,
    }
    encoded_header = base64url_encode(json.dumps(header, separators=(",", ":")).encode("utf8"))
    encoded_payload = base64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf8"))
    signing_input = f"{encoded_header}.{encoded_payload}".encode("ascii")
    signature = sign_rs256(signing_input, credentials["private_key"])
    return f"{encoded_header}.{encoded_payload}.{base64url_encode(signature)}"


def fetch_access_token(credentials):
    jwt_assertion = build_service_account_jwt(credentials)
    payload = urllib.parse.urlencode(
        {
            "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
            "assertion": jwt_assertion,
        }
    ).encode("utf8")
    request = urllib.request.Request(
        TOKEN_URL,
        data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urllib.request.urlopen(request) as response:
        body = json.loads(response.read().decode("utf8"))
    return body["access_token"]


def build_dimension_filters(query, country, device):
    filters = [
        {"dimension": "query", "operator": "equals", "expression": query},
    ]
    if country:
        filters.append({"dimension": "country", "operator": "equals", "expression": country})
    if device:
        filters.append({"dimension": "device", "operator": "equals", "expression": device})
    return [{"groupType": "and", "filters": filters}]


def query_search_console(access_token, site_url, query, start_date, end_date, country, device, result_type):
    encoded_site = urllib.parse.quote(site_url, safe="")
    url = f"{SEARCH_ANALYTICS_BASE}{encoded_site}/searchAnalytics/query"
    body = {
        "startDate": start_date,
        "endDate": end_date,
        "dimensions": ["query", "page"],
        "rowLimit": 10,
        "dimensionFilterGroups": build_dimension_filters(query, country, device),
    }
    if result_type:
        body["type"] = result_type

    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf8"),
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request) as response:
            payload = json.loads(response.read().decode("utf8"))
    except urllib.error.HTTPError as exc:
        details = exc.read().decode("utf8", errors="replace")
        raise RuntimeError(f"Search Console API error for query '{query}': {details}") from exc

    rows = payload.get("rows", [])
    if not rows:
        return {
            "query": query,
            "found": "no",
            "page": "",
            "clicks": 0,
            "impressions": 0,
            "ctr": 0,
            "position": "",
        }

    best = rows[0]
    keys = best.get("keys", [])
    return {
        "query": query,
        "found": "yes",
        "page": keys[1] if len(keys) > 1 else "",
        "clicks": best.get("clicks", 0),
        "impressions": best.get("impressions", 0),
        "ctr": round(best.get("ctr", 0) * 100, 2),
        "position": round(best.get("position", 0), 2),
    }


def write_csv(output_path, rows, checked_at, start_date, end_date, site_url):
    headers = [
        "checked_at",
        "site_url",
        "start_date",
        "end_date",
        "query",
        "found",
        "page",
        "position",
        "clicks",
        "impressions",
        "ctr_percent",
    ]
    with open(output_path, "w", encoding="utf8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=headers)
        writer.writeheader()
        for row in rows:
            writer.writerow(
                {
                    "checked_at": checked_at,
                    "site_url": site_url,
                    "start_date": start_date,
                    "end_date": end_date,
                    "query": row["query"],
                    "found": row["found"],
                    "page": row["page"],
                    "position": row["position"],
                    "clicks": row["clicks"],
                    "impressions": row["impressions"],
                    "ctr_percent": row["ctr"],
                }
            )


def append_history(history_path, rows, checked_at, start_date, end_date, site_url):
    headers = [
        "checked_at",
        "site_url",
        "start_date",
        "end_date",
        "query",
        "found",
        "page",
        "position",
        "clicks",
        "impressions",
        "ctr_percent",
    ]
    file_exists = Path(history_path).exists()
    with open(history_path, "a", encoding="utf8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=headers)
        if not file_exists:
            writer.writeheader()
        for row in rows:
            writer.writerow(
                {
                    "checked_at": checked_at,
                    "site_url": site_url,
                    "start_date": start_date,
                    "end_date": end_date,
                    "query": row["query"],
                    "found": row["found"],
                    "page": row["page"],
                    "position": row["position"],
                    "clicks": row["clicks"],
                    "impressions": row["impressions"],
                    "ctr_percent": row["ctr"],
                }
            )


def print_summary(rows):
    found_rows = [row for row in rows if row["found"] == "yes"]
    print(f"Queries checked: {len(rows)}")
    print(f"Queries found in Search Console: {len(found_rows)}")

    if not found_rows:
        return

    sorted_rows = sorted(
        found_rows,
        key=lambda row: (float(row["position"]) if row["position"] != "" else 9999, -float(row["impressions"])),
    )

    print("\nTop visible queries:")
    for row in sorted_rows[:10]:
        print(
            f"- {row['query']} | pos {row['position']} | imp {row['impressions']} | "
            f"clicks {row['clicks']} | {row['page']}"
        )


def main():
    args = parse_args()

    if not args.credentials:
        print(
            "Credentials are required. Pass --credentials /path/to/key.json or set "
            "GOOGLE_APPLICATION_CREDENTIALS.",
            file=sys.stderr,
        )
        sys.exit(1)

    credentials_path = Path(args.credentials)
    if not credentials_path.exists():
        print(f"Credentials file not found: {credentials_path}", file=sys.stderr)
        sys.exit(1)

    queries = load_queries(args.queries_file, args.limit)
    if not queries:
        print("No queries loaded from input file.", file=sys.stderr)
        sys.exit(1)

    credentials = json.loads(credentials_path.read_text(encoding="utf8"))
    access_token = fetch_access_token(credentials)
    checked_at = time.strftime("%Y-%m-%d %H:%M:%S")
    rows = []

    for index, query in enumerate(queries, start=1):
        print(f"[{index}/{len(queries)}] {query}")
        row = query_search_console(
            access_token=access_token,
            site_url=args.site_url,
            query=query,
            start_date=args.start_date,
            end_date=args.end_date,
            country=args.country,
            device=args.device,
            result_type=args.result_type,
        )
        rows.append(row)
        time.sleep(args.pause_ms / 1000)

    write_csv(args.output, rows, checked_at, args.start_date, args.end_date, args.site_url)
    append_history(args.history_output, rows, checked_at, args.start_date, args.end_date, args.site_url)
    print_summary(rows)
    print(f"\nReport written to: {args.output}")
    print(f"History appended to: {args.history_output}")


if __name__ == "__main__":
    main()
