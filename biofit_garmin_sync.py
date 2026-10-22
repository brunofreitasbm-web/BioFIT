#!/usr/bin/env python3
"""
BIOFIT <- Garmin: busca métricas no Garmin Connect e envia à função
biofit-garmin-ingest (Supabase PLAY).

Roda no SEU computador (IP residencial), porque o Garmin bloqueia login vindo
de datacenter. Requer Python 3.12+.

Instalação (uma vez):
    pip install --upgrade garminconnect curl_cffi requests

Primeiro uso (pede e-mail, senha e código MFA no terminal; a senha NÃO fica
salva, só os tokens em ~/.garminconnect):
    python biofit_garmin_sync.py --login

Uso diário (usa os tokens salvos, sem senha):
    export BIOFIT_GARMIN_INGEST_TOKEN="o mesmo valor cadastrado no Supabase"
    python biofit_garmin_sync.py              # últimos 3 dias
    python biofit_garmin_sync.py --dias 60    # histórico (backfill)
    python biofit_garmin_sync.py --dry-run    # mostra o que enviaria, sem enviar

STATUS: escrito sem poder testar com a sua conta. Os nomes de campos do Garmin
são tratados de forma defensiva: o que não for encontrado vai como nulo e é
listado no final. Rode com --dry-run antes do primeiro envio real.
"""
import argparse
import getpass
import json
import os
import sys
from datetime import date, datetime, timedelta, timezone

import requests
from garminconnect import Garmin

INGEST_URL = "https://ivjvpdzsfjdpyabbzzuj.supabase.co/functions/v1/biofit-garmin-ingest"
TOKENSTORE = os.path.expanduser("~/.garminconnect")
FUSO_LOCAL = timezone(timedelta(hours=-3))  # Belém


def get(d, *path, default=None):
    """Acesso seguro a dicionários aninhados."""
    for p in path:
        if isinstance(d, dict) and p in d:
            d = d[p]
        else:
            return default
    return d


def login_interativo():
    email = input("E-mail do Garmin: ").strip()
    senha = getpass.getpass("Senha do Garmin (não fica salva): ")
    api = Garmin(email, senha, prompt_mfa=lambda: input("Código MFA (se pedido): ").strip())
    api.login(TOKENSTORE)
    print(f"Login ok. Tokens salvos em {TOKENSTORE}")


def cliente():
    if not os.path.isdir(TOKENSTORE):
        sys.exit("Sem tokens. Rode primeiro: python biofit_garmin_sync.py --login")
    api = Garmin()
    api.login(TOKENSTORE)
    return api


def dia_metricas(api, dia: date, faltando: set):
    iso = dia.isoformat()
    linha = {"data": iso}

    def tenta(nome, fn):
        try:
            return fn()
        except Exception as e:  # noqa: BLE001 - queremos seguir mesmo se uma métrica falhar
            faltando.add(f"{nome}: {type(e).__name__}")
            return None

    hrv = tenta("hrv", lambda: api.get_hrv_data(iso))
    linha["vfc_noturna_ms"] = get(hrv, "hrvSummary", "lastNightAvg")
    linha["vfc_status"] = get(hrv, "hrvSummary", "status")
    linha["vfc_media_semanal_ms"] = get(hrv, "hrvSummary", "weeklyAvg")

    sono = tenta("sono", lambda: api.get_sleep_data(iso))
    seg = get(sono, "dailySleepDTO", "sleepTimeSeconds")
    linha["sono_minutos"] = round(seg / 60) if isinstance(seg, (int, float)) else None
    linha["sono_score"] = get(sono, "dailySleepDTO", "sleepScores", "overall", "value")

    stats = tenta("stats", lambda: api.get_stats(iso))
    linha["fc_repouso_bpm"] = get(stats, "restingHeartRate")
    linha["passos"] = get(stats, "totalSteps")
    linha["estresse_medio"] = get(stats, "averageStressLevel")
    linha["body_battery_max"] = get(stats, "bodyBatteryHighestValue")
    linha["body_battery_acordar"] = get(stats, "bodyBatteryAtWakeTime")

    if linha["body_battery_acordar"] is None:
        bb = tenta("body_battery", lambda: api.get_body_battery(iso))
        try:
            valores = [v[1] for v in (bb[0].get("bodyBatteryValuesArray") or []) if v[1] is not None]
            linha["body_battery_acordar"] = valores[0] if valores else None  # aproximação: 1º valor do dia
        except Exception:  # noqa: BLE001
            faltando.add("body_battery_acordar")

    # Dia sem nenhum dado útil não vale a linha.
    if all(linha.get(k) is None for k in linha if k != "data"):
        return None
    return linha


def treinos(api, ini: date, fim: date):
    saida = []
    for a in api.get_activities_by_date(ini.isoformat(), fim.isoformat()) or []:
        gmt = a.get("startTimeGMT")
        if not gmt:
            continue
        # Ignora atividades sem FC: são treinos importados do BIOFIT (arquivos FIT),
        # não gravações do relógio, e a duração deles foi estimada.
        if a.get("averageHR") is None:
            continue
        inicio = datetime.strptime(gmt, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
        saida.append({
            "garmin_activity_id": a.get("activityId"),
            "inicio_utc": inicio.isoformat(),
            "tipo": get(a, "activityType", "typeKey"),
            "duracao_s": round(a["duration"]) if isinstance(a.get("duration"), (int, float)) else None,
            "fc_media": a.get("averageHR"),
            "fc_max": a.get("maxHR"),
            "calorias": a.get("calories"),
            "biofit_sessao_data": inicio.astimezone(FUSO_LOCAL).date().isoformat(),
        })
    return saida


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--login", action="store_true", help="login interativo (primeira vez)")
    ap.add_argument("--dias", type=int, default=3, help="quantos dias buscar (padrão 3)")
    ap.add_argument("--dry-run", action="store_true", help="mostra e não envia")
    args = ap.parse_args()

    if args.login:
        return login_interativo()

    api = cliente()
    hoje = date.today()
    faltando: set = set()
    diario = []
    for i in range(args.dias):
        linha = dia_metricas(api, hoje - timedelta(days=i), faltando)
        if linha:
            diario.append(linha)
    corpo = {
        "diario": diario,
        "treinos": treinos(api, hoje - timedelta(days=args.dias), hoje),
    }

    print(f"Dias com dados: {len(corpo['diario'])} | Atividades: {len(corpo['treinos'])}")
    if faltando:
        print("Campos/endpoints que falharam (revisar nomes no Garmin):")
        for f in sorted(faltando):
            print("  -", f)

    if args.dry_run:
        print(json.dumps(corpo, indent=2, ensure_ascii=False)[:6000])
        return

    token = os.environ.get("BIOFIT_GARMIN_INGEST_TOKEN", "")
    if not token:
        sys.exit("Defina BIOFIT_GARMIN_INGEST_TOKEN no ambiente.")
    r = requests.post(
        INGEST_URL,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        data=json.dumps(corpo),
        timeout=60,
    )
    print(r.status_code, r.text)
    r.raise_for_status()


if __name__ == "__main__":
    main()
