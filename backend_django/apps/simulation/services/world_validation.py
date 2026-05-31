"""Pure world-validation logic — mirrors Spring's domain WorldValidationService
+ WorldValidationResult 1:1. No DB/framework deps; operates on a plain snapshot
dict and returns a WorldValidationState-shaped dict {errors, warnings, canPublish}.

Snapshot shape (all coords/sizes are ints):
    {
      "nodes":      [{"id", "startNode", "terminalNode", "x", "y"}],
      "decisions":  [{"id", "sourceNodeId", "targetNodeId", "prohibitedConduct", "prohibitionReason"}],
      "maps":       [{"id", "width", "height", "spawnX", "spawnY"}],
      "objects":    [{"id", "mapId", "x", "y", "width", "height", "type"}],
      "collisions": [{"id", "mapId", "x", "y", "width", "height"}],
      "dialogues":  [{"id", "mapId"}],
      "hasSafeExit": bool,
    }
"""

MAX_OBJECTS_PER_MAP = 250
MAX_COLLISIONS_PER_MAP = 300
MAX_TRIGGERS_PER_MAP = 100
MAX_MAP_WIDTH = 2560
MAX_MAP_HEIGHT = 1920
DIALOGUE_WARN_THRESHOLD = 50


def _issue(severity, code, message, ref):
    return {"severity": severity, "code": code, "message": message, "entityRef": ref}


def _err(code, message, ref=None):
    return _issue("ERROR", code, message, ref)


def _warn(code, message, ref=None):
    return _issue("WARNING", code, message, ref)


def validate(snapshot):
    """Return a WorldValidationState dict: {errors, warnings, canPublish}."""
    issues = []
    _validate_graph(snapshot["nodes"], snapshot["decisions"], issues)
    _validate_geometry(snapshot, issues)
    _validate_ethics(snapshot["decisions"], issues)
    _validate_safe_exit(snapshot["hasSafeExit"], issues)
    _validate_limits(snapshot, issues)

    errors = [i for i in issues if i["severity"] == "ERROR"]
    warnings = [i for i in issues if i["severity"] == "WARNING"]
    return {"errors": errors, "warnings": warnings, "canPublish": len(errors) == 0}


# ─── DAG ───────────────────────────────────────────────────────────────────
def _validate_graph(nodes, decisions, issues):
    if not nodes:
        issues.append(_err("NO_NODES", "El caso debe tener al menos un nodo"))
        return

    start_count = sum(1 for n in nodes if n["startNode"])
    if start_count == 0:
        issues.append(_err(
            "NO_START_NODE",
            "El grafo debe tener exactamente un nodo inicial; no se encontró ninguno",
        ))
    elif start_count > 1:
        issues.append(_err(
            "MULTIPLE_START_NODES",
            f"El grafo tiene {start_count} nodos iniciales; debe tener exactamente 1",
        ))

    terminal_count = sum(1 for n in nodes if n["terminalNode"])
    if terminal_count == 0:
        issues.append(_err(
            "NO_TERMINAL_NODE",
            "El grafo debe tener al menos un nodo terminal (fin de simulación)",
        ))

    _detect_cycle(nodes, decisions, issues)


def _detect_cycle(nodes, decisions, issues):
    adjacency = {n["id"]: [] for n in nodes}
    for d in decisions:
        adjacency.setdefault(d["sourceNodeId"], []).append(d["targetNodeId"])

    visiting, visited = set(), set()

    def has_cycle(node_id):
        if node_id in visiting:
            return True
        visiting.add(node_id)
        for nxt in adjacency.get(node_id, []):
            if nxt not in visited and has_cycle(nxt):
                return True
        visiting.discard(node_id)
        visited.add(node_id)
        return False

    for n in nodes:
        if n["id"] not in visited:
            if has_cycle(n["id"]):
                issues.append(_err(
                    "GRAPH_CYCLE",
                    "El grafo contiene un ciclo; los ciclos impiden que la simulación pueda finalizar",
                ))
                return


# ─── Geometry ──────────────────────────────────────────────────────────────
def _in_bounds(x, y, w, h, m):
    return x >= 0 and y >= 0 and (x + w) <= m["width"] and (y + h) <= m["height"]


def _validate_geometry(snapshot, issues):
    by_id = {}
    for m in snapshot["maps"]:
        by_id[m["id"]] = m
        if (m["spawnX"] < 0 or m["spawnX"] > m["width"]
                or m["spawnY"] < 0 or m["spawnY"] > m["height"]):
            issues.append(_err(
                "SPAWN_OUT_OF_BOUNDS",
                f"El spawn ({m['spawnX']},{m['spawnY']}) está fuera del mapa id={m['id']}",
                f"map:{m['id']}",
            ))

    for o in snapshot["objects"]:
        m = by_id.get(o["mapId"])
        if m is not None and not _in_bounds(o["x"], o["y"], o["width"], o["height"], m):
            issues.append(_err(
                "OBJECT_OUT_OF_BOUNDS",
                f"Objeto id={o['id']} está fuera del mapa id={o['mapId']}",
                f"object:{o['id']}",
            ))

    for c in snapshot["collisions"]:
        m = by_id.get(c["mapId"])
        if m is not None and not _in_bounds(c["x"], c["y"], c["width"], c["height"], m):
            issues.append(_err(
                "COLLISION_OUT_OF_BOUNDS",
                f"Colisión id={c['id']} está fuera del mapa id={c['mapId']}",
                f"collision:{c['id']}",
            ))


# ─── Ethics ────────────────────────────────────────────────────────────────
def _validate_ethics(decisions, issues):
    for d in decisions:
        reason = d.get("prohibitionReason")
        if d["prohibitedConduct"] and (reason is None or not reason.strip()):
            issues.append(_err(
                "PROHIBITED_WITHOUT_REASON",
                f"La decisión prohibida id={d['id']} debe documentar la razón de prohibición",
                f"decision:{d['id']}",
            ))


# ─── Safe exit ─────────────────────────────────────────────────────────────
def _validate_safe_exit(has_safe_exit, issues):
    if not has_safe_exit:
        issues.append(_err(
            "NO_SAFE_EXIT",
            "El caso debe tener al menos un objeto EXIT configurado como salida segura",
        ))


# ─── Limits ────────────────────────────────────────────────────────────────
def _validate_limits(snapshot, issues):
    for m in snapshot["maps"]:
        if m["width"] > MAX_MAP_WIDTH or m["height"] > MAX_MAP_HEIGHT:
            issues.append(_err(
                "MAP_TOO_LARGE",
                f"Mapa id={m['id']} ({m['width']}×{m['height']}px) excede el límite "
                f"{MAX_MAP_WIDTH}×{MAX_MAP_HEIGHT}px",
                f"map:{m['id']}",
            ))

        obj_count = sum(1 for o in snapshot["objects"] if o["mapId"] == m["id"])
        if obj_count > MAX_OBJECTS_PER_MAP:
            issues.append(_err(
                "TOO_MANY_OBJECTS",
                f"Mapa id={m['id']} tiene {obj_count} objetos (máx {MAX_OBJECTS_PER_MAP})",
                f"map:{m['id']}",
            ))

        col_count = sum(1 for c in snapshot["collisions"] if c["mapId"] == m["id"])
        if col_count > MAX_COLLISIONS_PER_MAP:
            issues.append(_err(
                "TOO_MANY_COLLISIONS",
                f"Mapa id={m['id']} tiene {col_count} colisiones (máx {MAX_COLLISIONS_PER_MAP})",
                f"map:{m['id']}",
            ))

        trig_count = sum(
            1 for o in snapshot["objects"]
            if o["mapId"] == m["id"] and (o["type"] or "").upper() == "TRIGGER"
        )
        if trig_count > MAX_TRIGGERS_PER_MAP:
            issues.append(_err(
                "TOO_MANY_TRIGGERS",
                f"Mapa id={m['id']} tiene {trig_count} triggers (máx {MAX_TRIGGERS_PER_MAP})",
                f"map:{m['id']}",
            ))

        dlg_count = sum(1 for d in snapshot["dialogues"] if d["mapId"] == m["id"])
        if dlg_count >= DIALOGUE_WARN_THRESHOLD:
            issues.append(_warn(
                "MANY_DIALOGUES",
                f"Mapa id={m['id']} tiene {dlg_count} diálogos; considera distribuirlos en más nodos",
                f"map:{m['id']}",
            ))
