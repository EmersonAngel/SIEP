import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { resolveScenarioConfigAssetKey } from '../../features/simulator/scenario-config-assets.util';
import {
  AttemptTrace,
  AttemptCompletionReport,
  CaseEditorView,
  CatalogItem,
  ChecklistUpdateRequest,
  DecisionOptionUpsertRequest,
  InteractionResult,
  MapObjectUpsertRequest,
  MapUpsertRequest,
  NodeUpsertRequest,
  RecentAttempt,
  RubricEvaluationView,
  ScenarioConfig,
  SimulationAttemptState,
  SimulationCaseSummary,
  StudentAttemptSummary,
  ProgressMapState,
  SimulationWorldState,
  ToolUpsertRequest,
  ToolUseResult,
  WorldDefinition,
  WorldSaveRequest,
  WorldValidationState
} from '../models/simulation.model';

export interface CaseCreateRequest {
  title: string;
  code?: string | null;
  description?: string | null;
}

interface ApiResponse<T> {
  data: T;
}

@Injectable({ providedIn: 'root' })
export class SimulationService {
  private readonly http = inject(HttpClient);
  private readonly API = '/api/simulation';

  listCases() {
    return this.http.get<ApiResponse<SimulationCaseSummary[]>>(`${this.API}/cases`)
      .pipe(map(response => response.data));
  }

  getCatalog() {
    return this.http.get<ApiResponse<CatalogItem[]>>(`${this.API}/catalog`)
      .pipe(map(response => response.data));
  }

  startAttempt(caseVersionId: number, forceNew = false) {
    return this.http.post<ApiResponse<SimulationAttemptState>>(`${this.API}/attempts`, { caseVersionId, forceNew })
      .pipe(map(response => response.data));
  }

  getActiveAttempt(caseVersionId: number) {
    return this.http.get<ApiResponse<SimulationAttemptState>>(`${this.API}/cases/${caseVersionId}/active-attempt`, {
      observe: 'response'
    }).pipe(map(response => response.status === 204 ? null : response.body!.data));
  }

  getProgressMap(attemptId: string, attemptToken: string) {
    const params = new HttpParams().set('attemptToken', attemptToken);
    return this.http.get<ApiResponse<ProgressMapState>>(`${this.API}/attempts/${attemptId}/progress-map`, { params })
      .pipe(map(response => response.data));
  }

  getAttempt(attemptId: string, attemptToken: string) {
    const params = new HttpParams().set('attemptToken', attemptToken);
    return this.http.get<ApiResponse<SimulationAttemptState>>(`${this.API}/attempts/${attemptId}`, { params })
      .pipe(map(response => response.data));
  }

  getWorld(attemptId: string, attemptToken: string) {
    const params = new HttpParams().set('attemptToken', attemptToken);
    return this.http.get<ApiResponse<SimulationWorldState>>(`${this.API}/attempts/${attemptId}/world`, { params })
      .pipe(map(response => response.data));
  }

  getScenarioConfig(mapOrScenarioKey: string) {
    const assetKey = resolveScenarioConfigAssetKey(mapOrScenarioKey);
    return this.http.get<ScenarioConfig>(`/assets/game/scenarios/${assetKey}.json`);
  }

  /** Reglas de reacción del paciente (asset frontend versionado, Fase 8). */
  getInterventionRules() {
    return this.http.get<unknown>('/assets/game/scenarios/intervention-rules.json');
  }

  /** Fase 5: walk-through spatial door — load the target room (non-scored).
   *  doorKey (opcional, caso PDF): el backend valida que la puerta exista en la
   *  sala actual, apunte al destino y cumpla sus condiciones requires*. */
  enterRoom(attemptId: string, attemptToken: string, targetNodeKey: string, entryX: number, entryY: number, doorKey?: string) {
    return this.http.post<ApiResponse<SimulationWorldState>>(`${this.API}/attempts/${attemptId}/enter-room`, {
      attemptToken, targetNodeKey, entryX, entryY, ...(doorKey ? { doorKey } : {}),
    }).pipe(map(response => response.data));
  }

  updateWorldState(attemptId: string, attemptToken: string, playerX: number, playerY: number, currentMapKey: string) {
    return this.http.patch<ApiResponse<SimulationWorldState>>(`${this.API}/attempts/${attemptId}/world-state`, {
      attemptToken,
      playerX,
      playerY,
      currentMapKey
    }).pipe(map(response => response.data));
  }

  openInteraction(attemptId: string, attemptToken: string, interactionKey: string) {
    return this.http.post<ApiResponse<InteractionResult>>(`${this.API}/attempts/${attemptId}/interactions/${interactionKey}`, {
      attemptToken
    }).pipe(map(response => response.data));
  }

  useTool(attemptId: string, attemptToken: string, toolCode: string, targetInteractionKey: string | null) {
    return this.http.post<ApiResponse<ToolUseResult>>(`${this.API}/attempts/${attemptId}/tools/use`, {
      attemptToken,
      toolCode,
      targetInteractionKey
    }).pipe(map(response => response.data));
  }

  recordNpcInteraction(attemptId: string, attemptToken: string, npcKey: string) {
    return this.http.post<ApiResponse<SimulationWorldState>>(`${this.API}/attempts/${attemptId}/npcs/${encodeURIComponent(npcKey)}`, {
      attemptToken
    }).pipe(map(response => response.data));
  }

  chooseDecision(attemptId: string, attemptToken: string, decisionOptionId: number) {
    return this.http.post<ApiResponse<SimulationAttemptState>>(`${this.API}/attempts/${attemptId}/decisions`, {
      attemptToken,
      decisionOptionId
    }).pipe(map(response => response.data));
  }

  saveReflection(attemptId: string, attemptToken: string, nodeId: number, text: string) {
    return this.http.post<ApiResponse<{ nodeId: number; locked: boolean }>>(`${this.API}/attempts/${attemptId}/reflections`, {
      attemptToken,
      nodeId,
      text
    }).pipe(map(response => response.data));
  }

  safeExit(attemptId: string, attemptToken: string, reason: string) {
    return this.http.post<ApiResponse<SimulationAttemptState>>(`${this.API}/attempts/${attemptId}/safe-exit`, {
      attemptToken,
      reason
    }).pipe(map(response => response.data));
  }

  getCompletionReport(attemptId: string, attemptToken: string) {
    const params = new HttpParams().set('attemptToken', attemptToken);
    return this.http.get<ApiResponse<AttemptCompletionReport>>(`${this.API}/attempts/${attemptId}/completion-report`, { params })
      .pipe(map(response => response.data));
  }

  attemptHistory() {
    return this.http.get<ApiResponse<StudentAttemptSummary[]>>(`${this.API}/attempts/history`)
      .pipe(map(response => response.data));
  }

  studentReport(attemptId: string) {
    return this.http.get<ApiResponse<AttemptCompletionReport>>(`${this.API}/attempts/${attemptId}/student-report`)
      .pipe(map(response => response.data));
  }

  recentAttempts() {
    return this.http.get<ApiResponse<RecentAttempt[]>>('/api/instructor/attempts/recent')
      .pipe(map(response => response.data));
  }

  attemptTrace(attemptId: string) {
    return this.http.get<ApiResponse<AttemptTrace>>(`/api/instructor/attempts/${attemptId}/trace`)
      .pipe(map(response => response.data));
  }

  rubric(attemptId: string) {
    return this.http.get<ApiResponse<RubricEvaluationView>>(`/api/instructor/attempts/${attemptId}/rubric-evaluation/`)
      .pipe(map(response => response.data));
  }

  saveRubric(attemptId: string, rubricId: number, comment: string, scores: { criterionId: number; score: number; comment: string }[]) {
    return this.http.put<ApiResponse<RubricEvaluationView>>(`/api/instructor/attempts/${attemptId}/rubric-evaluation/`, {
      rubricId,
      comment,
      scores
    }).pipe(map(response => response.data));
  }

  caseEditor(caseVersionId: number) {
    return this.http.get<ApiResponse<CaseEditorView>>(`/api/admin/cases/${caseVersionId}/editor`)
      .pipe(map(response => response.data));
  }

  publishCase(caseVersionId: number) {
    return this.http.post<ApiResponse<CaseEditorView>>(`/api/admin/cases/${caseVersionId}/publish`, {})
      .pipe(map(response => response.data));
  }

  cloneCaseVersion(caseVersionId: number) {
    return this.http.post<ApiResponse<CaseEditorView>>(`/api/admin/cases/${caseVersionId}/clone-version`, {})
      .pipe(map(response => response.data));
  }

  listAuthoringCases() {
    return this.http.get<ApiResponse<SimulationCaseSummary[]>>('/api/admin/cases')
      .pipe(map(response => response.data));
  }

  createCase(body: CaseCreateRequest) {
    return this.http.post<ApiResponse<CaseEditorView>>('/api/admin/cases', body)
      .pipe(map(response => response.data));
  }

  // ─── Node CRUD ──────────────────────────────────────────────────────────────

  createNode(caseVersionId: number, body: NodeUpsertRequest) {
    return this.http.post<ApiResponse<CaseEditorView>>(`/api/admin/cases/${caseVersionId}/nodes`, body)
      .pipe(map(r => r.data));
  }

  updateNode(caseVersionId: number, nodeId: number, body: NodeUpsertRequest) {
    return this.http.put<ApiResponse<CaseEditorView>>(`/api/admin/cases/${caseVersionId}/nodes/${nodeId}`, body)
      .pipe(map(r => r.data));
  }

  deleteNode(caseVersionId: number, nodeId: number) {
    return this.http.delete<ApiResponse<CaseEditorView>>(`/api/admin/cases/${caseVersionId}/nodes/${nodeId}`)
      .pipe(map(r => r.data));
  }

  // ─── Decision CRUD ──────────────────────────────────────────────────────────

  createDecision(caseVersionId: number, body: DecisionOptionUpsertRequest) {
    return this.http.post<ApiResponse<CaseEditorView>>(`/api/admin/cases/${caseVersionId}/decisions`, body)
      .pipe(map(r => r.data));
  }

  updateDecision(caseVersionId: number, decisionId: number, body: DecisionOptionUpsertRequest) {
    return this.http.put<ApiResponse<CaseEditorView>>(`/api/admin/cases/${caseVersionId}/decisions/${decisionId}`, body)
      .pipe(map(r => r.data));
  }

  deleteDecision(caseVersionId: number, decisionId: number) {
    return this.http.delete<ApiResponse<CaseEditorView>>(`/api/admin/cases/${caseVersionId}/decisions/${decisionId}`)
      .pipe(map(r => r.data));
  }

  // ─── Map CRUD ───────────────────────────────────────────────────────────────

  createMap(caseVersionId: number, body: MapUpsertRequest) {
    return this.http.post<ApiResponse<CaseEditorView>>(`/api/admin/cases/${caseVersionId}/maps`, body)
      .pipe(map(r => r.data));
  }

  updateMap(caseVersionId: number, mapId: number, body: MapUpsertRequest) {
    return this.http.put<ApiResponse<CaseEditorView>>(`/api/admin/cases/${caseVersionId}/maps/${mapId}`, body)
      .pipe(map(r => r.data));
  }

  deleteMap(caseVersionId: number, mapId: number) {
    return this.http.delete<ApiResponse<CaseEditorView>>(`/api/admin/cases/${caseVersionId}/maps/${mapId}`)
      .pipe(map(r => r.data));
  }

  // ─── Map Object CRUD ────────────────────────────────────────────────────────

  createObject(caseVersionId: number, mapId: number, body: MapObjectUpsertRequest) {
    return this.http.post<ApiResponse<CaseEditorView>>(`/api/admin/cases/${caseVersionId}/maps/${mapId}/objects`, body)
      .pipe(map(r => r.data));
  }

  updateObject(caseVersionId: number, objectId: number, body: MapObjectUpsertRequest) {
    return this.http.put<ApiResponse<CaseEditorView>>(`/api/admin/cases/${caseVersionId}/objects/${objectId}`, body)
      .pipe(map(r => r.data));
  }

  deleteObject(caseVersionId: number, objectId: number) {
    return this.http.delete<ApiResponse<CaseEditorView>>(`/api/admin/cases/${caseVersionId}/objects/${objectId}`)
      .pipe(map(r => r.data));
  }

  // ─── Tool CRUD ──────────────────────────────────────────────────────────────

  createTool(caseVersionId: number, body: ToolUpsertRequest) {
    return this.http.post<ApiResponse<CaseEditorView>>(`/api/admin/cases/${caseVersionId}/tools`, body)
      .pipe(map(r => r.data));
  }

  updateTool(caseVersionId: number, toolId: number, body: ToolUpsertRequest) {
    return this.http.put<ApiResponse<CaseEditorView>>(`/api/admin/cases/${caseVersionId}/tools/${toolId}`, body)
      .pipe(map(r => r.data));
  }

  deleteTool(caseVersionId: number, toolId: number) {
    return this.http.delete<ApiResponse<CaseEditorView>>(`/api/admin/cases/${caseVersionId}/tools/${toolId}`)
      .pipe(map(r => r.data));
  }

  // ─── Checklist ──────────────────────────────────────────────────────────────

  updateChecklist(caseVersionId: number, body: ChecklistUpdateRequest) {
    return this.http.put<ApiResponse<CaseEditorView>>(`/api/admin/cases/${caseVersionId}/checklist`, body)
      .pipe(map(r => r.data));
  }

  // ─── WorldDefinition v2 (Fase 2) ──────────────────────────────────────────

  /** Carga el WorldDefinition completo de un nodo/mapa para el editor Konva. */
  worldEditor(caseVersionId: number, nodeId?: number) {
    let params = new HttpParams();
    if (nodeId != null) params = params.set('nodeId', nodeId);
    return this.http.get<ApiResponse<WorldDefinition>>(
      `/api/admin/cases/${caseVersionId}/world-editor`, { params })
      .pipe(map(r => r.data));
  }

  /** Guarda el borrador del mundo (con bloqueo optimista por revision). */
  saveWorld(caseVersionId: number, body: WorldSaveRequest, nodeId?: number) {
    let params = new HttpParams();
    if (nodeId != null) params = params.set('nodeId', nodeId);
    return this.http.put<ApiResponse<WorldDefinition>>(
      `/api/admin/cases/${caseVersionId}/world`, body, { params })
      .pipe(map(r => r.data));
  }

  /** Ejecuta validacion del mundo sin mutar datos. */
  validateWorld(caseVersionId: number) {
    return this.http.post<ApiResponse<WorldValidationState>>(
      `/api/admin/cases/${caseVersionId}/world/validate`, {})
      .pipe(map(r => r.data));
  }

  /** Preview efimero del mundo DRAFT (sin crear attempt). */
  worldPreview(caseVersionId: number, nodeId?: number) {
    let params = new HttpParams();
    if (nodeId != null) params = params.set('nodeId', nodeId);
    return this.http.get<ApiResponse<WorldDefinition>>(
      `/api/admin/cases/${caseVersionId}/world-preview`, { params })
      .pipe(map(r => r.data));
  }
}
