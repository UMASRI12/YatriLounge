import os
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

INSFORGE_BASE_URL = os.getenv("INSFORGE_BASE_URL", "").rstrip("/")
INSFORGE_ANON_KEY = os.getenv("INSFORGE_ANON_KEY", "")


def require_env() -> None:
    if not INSFORGE_BASE_URL:
        raise HTTPException(
            status_code=500,
            detail="INSFORGE_BASE_URL is not set. Create backend/.env and set INSFORGE_BASE_URL.",
        )


def auth_headers() -> Dict[str, str]:
    # InsForge Database REST expects Authorization Bearer (anon key is sufficient for public reads).
    token = INSFORGE_ANON_KEY.strip()
    if not token:
        return {}
    return {"Authorization": f"Bearer {token}"}


async def insforge_get_records(
    client: httpx.AsyncClient, table: str, params: Optional[Dict[str, str]] = None
) -> List[Dict[str, Any]]:
    url = f"{INSFORGE_BASE_URL}/api/database/records/{table}"
    res = await client.get(url, headers=auth_headers(), params=params or {})
    if res.status_code >= 400:
        try:
            payload = res.json()
        except Exception:
            payload = {"message": res.text}
        raise HTTPException(status_code=res.status_code, detail=payload.get("message") or "InsForge request failed")
    return res.json()


app = FastAPI(title="YatriLounge API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"ok": True, "service": "yatrilounge-api"}


@app.get("/api/dashboard")
async def get_dashboard(airport: str = "DEL"):
    """
    Returns data in the same shape the React dashboard expects:
    {
      airports: [{code, city, flightsMonitored}],
      status: {occupancyPercent, peopleInLounge, flightsNext3Hours},
      forecast: [{time, value}],
      flights: [{time, airline, aircraft, business, premium, economy}]
    }
    """
    require_env()

    async with httpx.AsyncClient(timeout=15.0) as client:
        airports_rows = await insforge_get_records(
            client,
            "airports",
            params={
                "select": "code,city,flights_monitored",
                "order": "code.asc",
            },
        )

        status_rows = await insforge_get_records(
            client,
            "lounge_status",
            params={
                "select": "occupancy_percent,people,flights_next_3_hours,updated_at",
                "airport_code": f"eq.{airport}",
                "order": "updated_at.desc",
                "limit": "1",
            },
        )

        forecast_rows = await insforge_get_records(
            client,
            "occupancy_forecast",
            params={
                "select": "time_label,value,sort_order",
                "airport_code": f"eq.{airport}",
                "order": "sort_order.asc",
            },
        )

        flights_rows = await insforge_get_records(
            client,
            "flight_schedule",
            params={
                "select": "time_label,airline,aircraft,business,premium,economy,sort_order",
                "airport_code": f"eq.{airport}",
                "order": "sort_order.asc",
            },
        )

    airports = [
        {
            "code": r.get("code"),
            "city": r.get("city"),
            "flightsMonitored": r.get("flights_monitored", 0),
        }
        for r in airports_rows
    ]

    status_row = status_rows[0] if status_rows else {}
    status = {
        "occupancyPercent": int(status_row.get("occupancy_percent", 0) or 0),
        "peopleInLounge": int(status_row.get("people", 0) or 0),
        "flightsNext3Hours": int(status_row.get("flights_next_3_hours", 0) or 0),
    }

    forecast = [{"time": r.get("time_label"), "value": int(r.get("value", 0) or 0)} for r in forecast_rows]

    flights = [
        {
            "time": r.get("time_label"),
            "airline": r.get("airline"),
            "aircraft": r.get("aircraft"),
            "business": int(r.get("business", 0) or 0),
            "premium": int(r.get("premium", 0) or 0),
            "economy": int(r.get("economy", 0) or 0),
        }
        for r in flights_rows
    ]

    return {
        "airports": airports,
        "status": status,
        "forecast": forecast,
        "flights": flights,
    }

