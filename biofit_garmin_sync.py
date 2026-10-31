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

Uso diário (usa os tokens salvos, sem senha). O app na Vercel lê do Supabase, então o
token é obrigatório (no Windows, uma vez: setx BIOFIT_GARMIN_INGEST_TOKEN "<token>"):
    export BIOFIT_GARMIN_INGEST_TOKEN="o mesmo valor cadastrado no Supabase"
    python biofit_garmin_sync.py              # últimos 3 dias
    python biofit_garmin_sync.py --dias 60    # últimos 60 dias
    python biofit_garmin_sync.py --desde 2026-03-01   # backfill em blocos, com retomada
    python biofit_garmin_sync.py --dry-run    # mostra o que enviaria, sem enviar

Backfill: envia em blocos de 14 dias e guarda o último dia concluído em
~/.biofit_garmin_estado.json. Se cair no meio, rode o mesmo comando de novo e ele
continua de onde parou (use --recomecar para ignorar o estado).

Coleta: sono (fases, horários, respiração, SpO2), VFC e baseline, prontidão, status e
carga de treino (ACWR), VO2max, minutos de intensidade, calorias, curvas intradia de
Body Battery e estresse, e por atividade: efeito de treino, zonas de FC, distância, potência.

Os nomes de campos do Garmin são tratados de forma defensiva: o que não for encontrado
vai como nulo e é listado no final. Rode com --dry-run antes do primeiro envio real.
"""
import argparse
import getpass
import json
import os
import sys
import time
from datetime import date, datetime, timedelta, timezone

import requests
from garminconnect import Garmin

INGEST_URL = "https://ivjvpdzsfjdpyabbzzuj.supabase.co/functions/v1/biofit-garmin-ingest"
TOKENSTORE = os.path.expanduser("~/.garminconnect")
FUSO_LOCAL = timezone(timedelta(hours=-3))  # Belém
ESTADO = os.path.expanduser("~/.biofit_garmin_estado.json")  # último dia enviado no backfill
PAUSA_S = 0.35    # respiro entre chamadas ao Garmin (evita bloqueio por excesso)
BLOCO_DIAS = 14   # dias por envio ao Supabase
LOCAL_DIAS = 120  # janela mantida no JSON local do app


def get(d, *path, default=None):
    """Acesso seguro a dicionários aninhados."""
    for p in path:
        if isinstance(d, dict) and p in d:
            d = d[p]
        else:
            return default
    return d


def seg_para_min(v):
    return round(v / 60) if isinstance(v, (int, float)) else None


def ms_para_iso(v):
    if not isinstance(v, (int, float)):
        return None
    return datetime.fromtimestamp(v / 1000, tz=timezone.utc).isoformat()


def comprimir_curva(valores, passo_ms=15 * 60 * 1000):
    """[[ts_ms, valor], ...] -> 1 ponto por janela de 15 min (o primeiro válido)."""
    saida, ultimo = [], None
    for v in valores or []:
        try:
            ts, val = v[0], v[1]
        except (TypeError, IndexError, KeyError):
            continue
        if val is None or not isinstance(ts, (int, float)) or val < 0:
            continue  # estresse usa -1/-2 para "sem medida"
        if ultimo is None or ts - ultimo >= passo_ms:
            saida.append([int(ts), val])
            ultimo = ts
    return saida


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
    """Retorna (linha_diaria | None, [curvas_intradia])."""
    iso = dia.isoformat()
    linha = {"data": iso}
    curvas = []

    def tenta(nome, fn):
        try:
            time.sleep(PAUSA_S)
            return fn()
        except Exception as e:  # noqa: BLE001 - queremos seguir mesmo se uma métrica falhar
            faltando.add(f"{nome}: {type(e).__name__}")
            return None

    hrv = tenta("hrv", lambda: api.get_hrv_data(iso))
    linha["vfc_noturna_ms"] = get(hrv, "hrvSummary", "lastNightAvg")
    linha["vfc_status"] = get(hrv, "hrvSummary", "status")
    linha["vfc_media_semanal_ms"] = get(hrv, "hrvSummary", "weeklyAvg")
    linha["vfc_base_baixo_ms"] = get(hrv, "hrvSummary", "baseline", "balancedLow")
    linha["vfc_base_alto_ms"] = get(hrv, "hrvSummary", "baseline", "balancedUpper")

    sono = tenta("sono", lambda: api.get_sleep_data(iso))
    dto = get(sono, "dailySleepDTO", default={}) or {}
    linha["sono_minutos"] = seg_para_min(dto.get("sleepTimeSeconds"))
    linha["sono_score"] = get(dto, "sleepScores", "overall", "value")
    linha["sono_profundo_min"] = seg_para_min(dto.get("deepSleepSeconds"))
    linha["sono_rem_min"] = seg_para_min(dto.get("remSleepSeconds"))
    linha["sono_leve_min"] = seg_para_min(dto.get("lightSleepSeconds"))
    linha["sono_acordado_min"] = seg_para_min(dto.get("awakeSleepSeconds"))
    linha["sono_inicio_utc"] = ms_para_iso(dto.get("sleepStartTimestampGMT"))
    linha["sono_fim_utc"] = ms_para_iso(dto.get("sleepEndTimestampGMT"))
    linha["respiracao_media"] = dto.get("averageRespirationValue")
    linha["spo2_media"] = dto.get("averageSpO2Value")
    linha["spo2_min"] = dto.get("lowestSpO2Value")

    stats = tenta("stats", lambda: api.get_stats(iso))
    linha["fc_repouso_bpm"] = get(stats, "restingHeartRate")
    linha["passos"] = get(stats, "totalSteps")
    linha["estresse_medio"] = get(stats, "averageStressLevel")
    linha["body_battery_max"] = get(stats, "bodyBatteryHighestValue")
    linha["body_battery_acordar"] = get(stats, "bodyBatteryAtWakeTime")
    linha["minutos_intensidade_mod"] = get(stats, "moderateIntensityMinutes")
    linha["minutos_intensidade_vig"] = get(stats, "vigorousIntensityMinutes")
    linha["calorias_ativas"] = get(stats, "activeKilocalories")
    linha["calorias_bmr"] = get(stats, "bmrKilocalories")
    andares = get(stats, "floorsAscended")
    linha["andares"] = round(andares) if isinstance(andares, (int, float)) else None

    # Body Battery intradia (também serve de fallback para o valor ao acordar).
    bb = tenta("body_battery", lambda: api.get_body_battery(iso))
    try:
        brutos = (bb[0].get("bodyBatteryValuesArray") or []) if bb else []
        curva = comprimir_curva(brutos)
        if curva:
            curvas.append({"data": iso, "tipo": "body_battery", "pontos": curva})
        if linha["body_battery_acordar"] is None:
            valores = [v[1] for v in brutos if v[1] is not None]
            linha["body_battery_acordar"] = valores[0] if valores else None  # aproximação: 1º valor do dia
    except Exception:  # noqa: BLE001
        faltando.add("body_battery_curva")

    est = tenta("estresse", lambda: api.get_stress_data(iso))
    curva = comprimir_curva(get(est, "stressValuesArray", default=[]))
    if curva:
        curvas.append({"data": iso, "tipo": "estresse", "pontos": curva})

    pront = tenta("prontidao", lambda: api.get_training_readiness(iso))
    if isinstance(pront, list) and pront:
        pront = pront[0]
    linha["prontidao_score"] = get(pront, "score")
    linha["prontidao_nivel"] = get(pront, "level")

    status = tenta("status_treino", lambda: api.get_training_status(iso))
    recente = get(status, "mostRecentTrainingStatus", "latestTrainingStatusData", default={}) or {}
    disp = next(iter(recente.values()), {}) if isinstance(recente, dict) else {}
    linha["status_treino"] = get(disp, "trainingStatusFeedbackPhrase")
    linha["carga_aguda"] = get(disp, "acuteTrainingLoadDTO", "dailyTrainingLoadAcute")
    linha["carga_cronica"] = get(disp, "acuteTrainingLoadDTO", "dailyTrainingLoadChronic")
    linha["acwr"] = get(disp, "acuteTrainingLoadDTO", "dailyAcuteChronicWorkloadRatio")
    if linha["acwr"] is None:  # a pulseira (sem VO2max) não calcula a razão: derivamos de aguda/crônica
        ag, cr = linha["carga_aguda"], linha["carga_cronica"]
        if isinstance(ag, (int, float)) and isinstance(cr, (int, float)) and cr > 0:
            linha["acwr"] = round(ag / cr, 2)

    mm = tenta("vo2max", lambda: api.get_max_metrics(iso))
    if isinstance(mm, list) and mm:
        mm = mm[0]
    linha["vo2max"] = get(mm, "generic", "vo2MaxPreciseValue") or get(mm, "generic", "vo2MaxValue")

    # Dia sem nenhum dado útil não vale a linha.
    if all(linha.get(k) is None for k in linha if k != "data"):
        return None, curvas
    return linha, curvas


def zonas_fc(api, atividade):
    """Segundos em cada zona de FC [z1..z5]. A lista de atividades costuma trazer; senão busca."""
    z = [atividade.get(f"hrTimeInZone_{i}") for i in range(1, 6)]
    if all(isinstance(v, (int, float)) for v in z):
        return [round(v) for v in z]
    try:
        time.sleep(PAUSA_S)
        det = api.get_activity_hr_in_timezones(atividade.get("activityId")) or []
        por_zona = {d.get("zoneNumber"): d.get("secsInZone") for d in det if isinstance(d, dict)}
        z = [por_zona.get(i) for i in range(1, 6)]
        return [round(v) if isinstance(v, (int, float)) else 0 for v in z] if any(z) else None
    except Exception:  # noqa: BLE001
        return None


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
            "te_aerobico": a.get("aerobicTrainingEffect"),
            "te_anaerobico": a.get("anaerobicTrainingEffect"),
            "zonas_fc_s": zonas_fc(api, a),
            "distancia_m": a.get("distance"),
            "potencia_media": a.get("avgPower"),
        })
    return saida


def enviar(corpo, token):
    r = requests.post(
        INGEST_URL,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        data=json.dumps(corpo),
        timeout=60,
    )
    print("  Envio Supabase:", r.status_code, r.text[:200])
    r.raise_for_status()


def ler_estado():
    try:
        with open(ESTADO, encoding="utf-8") as f:
            return date.fromisoformat(json.load(f)["ultimo_dia"])
    except Exception:  # noqa: BLE001
        return None


def gravar_estado(dia: date):
    with open(ESTADO, "w", encoding="utf-8") as f:
        json.dump({"ultimo_dia": dia.isoformat()}, f)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--login", action="store_true", help="login interativo (primeira vez)")
    ap.add_argument("--dias", type=int, default=3, help="quantos dias buscar (padrão 3)")
    ap.add_argument("--desde", type=date.fromisoformat, help="backfill a partir de AAAA-MM-DD")
    ap.add_argument("--recomecar", action="store_true", help="ignora o estado salvo do backfill")
    ap.add_argument("--dry-run", action="store_true", help="mostra e não envia")
    args = ap.parse_args()

    if args.login:
        return login_interativo()

    token = os.environ.get("BIOFIT_GARMIN_INGEST_TOKEN", "")
    if not token and not args.dry_run:
        # Sem token o app publicado (Vercel) não recebe nada: falha alto e cedo, não em silêncio.
        sys.exit("ERRO: BIOFIT_GARMIN_INGEST_TOKEN não definido; nada foi enviado ao Supabase. "
                 "Defina uma vez no Windows: setx BIOFIT_GARMIN_INGEST_TOKEN \"<token>\" e abra um novo terminal.")

    api = cliente()
    hoje = date.today()
    inicio = args.desde or (hoje - timedelta(days=args.dias - 1))
    if args.desde and not args.recomecar:
        feito = ler_estado()
        if feito and feito >= inicio:
            inicio = feito + timedelta(days=1)  # retoma
            print(f"Retomando de {inicio} (último dia concluído: {feito}).")

    faltando: set = set()
    todo = {"diario": [], "treinos": [], "intraday": []}
    cursor = inicio
    while cursor <= hoje:
        fim_bloco = min(cursor + timedelta(days=BLOCO_DIAS - 1), hoje)
        print(f"Bloco {cursor} .. {fim_bloco}")
        bloco = {"diario": [], "treinos": [], "intraday": []}
        d = cursor
        while d <= fim_bloco:
            linha, curvas = dia_metricas(api, d, faltando)
            if linha:
                bloco["diario"].append(linha)
            bloco["intraday"].extend(curvas)
            d += timedelta(days=1)
        bloco["treinos"] = treinos(api, cursor, fim_bloco)
        print(f"  Dias com dados: {len(bloco['diario'])} | Atividades: {len(bloco['treinos'])} | Curvas: {len(bloco['intraday'])}")

        if not args.dry_run and token:
            enviar(bloco, token)
            if args.desde:
                gravar_estado(fim_bloco)
        for k in todo:
            todo[k].extend(bloco[k])
        cursor = fim_bloco + timedelta(days=1)

    if faltando:
        print("Campos/endpoints que falharam (revisar nomes no Garmin):")
        for f in sorted(faltando):
            print("  -", f)

    # Cópia local (dev) para o app e o Coach: só a janela recente, sem as curvas pesadas.
    corte = (hoje - timedelta(days=LOCAL_DIAS)).isoformat()
    local = {
        "diario": [x for x in todo["diario"] if x["data"] >= corte],
        "treinos": [x for x in todo["treinos"] if x["inicio_utc"][:10] >= corte],
    }
    caminho_local = os.path.join(os.path.dirname(os.path.abspath(__file__)), "apps", "treino", ".local", "garmin-data.json")
    try:
        os.makedirs(os.path.dirname(caminho_local), exist_ok=True)
        with open(caminho_local, "w", encoding="utf-8") as f:
            json.dump(local, f, indent=2, ensure_ascii=False)
        print(f"[OK] Dados locais do Garmin salvos para o BioFIT: {caminho_local}")
    except Exception as e:  # noqa: BLE001
        print(f"Aviso: erro ao salvar cópia local ({e})")

    if args.dry_run:
        print(json.dumps(todo, indent=2, ensure_ascii=False)[:6000])


if __name__ == "__main__":
    main()
