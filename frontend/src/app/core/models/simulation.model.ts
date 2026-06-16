export interface CatalogItem {
  caseVersionId: number;
  code: string;
  title: string;
  description: string;
  order: number;
  unlocked: boolean;
  completed: boolean;
  locked: boolean;
}

export interface SimulationCaseSummary {
  caseVersionId: number;
  code: string;
  title: string;
  description: string;
  semanticVersion: string;
  nodeCount: number;
  status: string;
}

export interface ProgressMapNode {
  key: string;
  label: string;
  start: boolean;
  terminal: boolean;
}

export interface ProgressMapState {
  nodes: ProgressMapNode[];
  visitedNodeKeys: string[];
  currentNodeKey: string;
}

export interface SimulationAttemptState {
  attemptId: string;
  attemptToken: string;
  caseVersionId: number;
  caseTitle: string;
  status: 'IN_PROGRESS' | 'SAFE_EXITED' | 'COMPLETED';
  accumulatedScore: number;
  stressIndex: number;
  metrics: SimulationMetrics;
  currentNode: SimulationNodeState;
  feedback: SimulationFeedback | null;
  completionReport: AttemptCompletionReport | null;
  supportResources: string[];
}

export interface SimulationMetrics {
  professionalScore: number;
  sceneStress: number;
  victimRisk: number;
  userTrust: number;
  institutionalRouteActivated: boolean;
  revictimizationRisk: boolean;
}

export interface AttemptTimelineEntry {
  atSeconds: number | null;
  time: string;
  type: string;
  classification: 'ADEQUATE' | 'RISKY' | 'INADEQUATE' | null;
  prohibited: boolean;
  label: string;
  scoreDelta: number;
  stressDelta: number;
}

export interface AttemptCompletionReport {
  attemptId: string;
  caseTitle: string;
  status: SimulationAttemptState['status'];
  finalScore: number;
  finalStress: number;
  metrics: SimulationMetrics;
  totalDurationSeconds: number | null;
  phaseDurations: PhaseDuration[];
  adequateDecisions: number;
  riskyDecisions: number;
  inadequateDecisions: number;
  prohibitedDecisions: number;
  toolsUsed: number;
  reflectionsCount: number;
  safeExitUsed: boolean;
  visitedNodeTitles: string[];
  competencies: string[];
  recommendations: string[];
  summaryMessage: string;
  /** Línea de tiempo de decisiones/acciones clave (backend puede omitirla). */
  timeline?: AttemptTimelineEntry[];
  /** Efecto mariposa: final canónico del caso (solo intentos COMPLETED). */
  ending?: AttemptEnding | null;
}

export interface AttemptEnding {
  key: 'integral' | 'brechas' | 'riesgo' | 'critico';
  title: string;
  message: string;
  tone: 'positive' | 'neutral' | 'warning' | 'critical';
  severityCounts: Record<'recommended' | 'acceptable' | 'risky' | 'critical', number>;
  caseFlags: Record<string, boolean>;
  caseMetrics: Record<string, number>;
}

export interface PhaseDuration {
  nodeId: number;
  nodeTitle: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
}

export interface SimulationNodeState {
  id: number;
  key: string;
  title: string;
  narrative: string;
  supportResources: string[];
  requiredTools: string[];
  sensitiveContent: boolean;
  safeExitRequired: boolean;
  warningMessage: string | null;
  terminal: boolean;
  options: SimulationDecisionOption[];
}

export interface SimulationDecisionOption {
  id: number;
  text: string;
  classification: 'ADEQUATE' | 'RISKY' | 'INADEQUATE';
  prohibitedConduct: boolean;
}

export interface SimulationFeedback {
  classification: 'ADEQUATE' | 'RISKY' | 'INADEQUATE';
  scoreDelta: number;
  stressDelta: number;
  trustDelta: number;
  victimRiskDelta: number;
  prohibitedConduct: boolean;
  institutionalRouteActivated: boolean;
  revictimizationRisk: boolean;
  message: string;
  prohibitionReason: string | null;
  /** True solo cuando el backend concede otra oportunidad (1ª respuesta mala).
   *  En la 2ª respuesta riesgosa/inadecuada queda registrada y llega en false. */
  retryRequired?: boolean;
}

export interface SimulationWorldState {
  attemptId: string;
  status: SimulationAttemptState['status'];
  map: SceneMapState;
  player: PlayerState;
  objects: MapObjectState[];
  collisions: CollisionZoneState[];
  tools: ClinicalToolState[];
  inventory: string[];
  inspectedObjectKeys: string[];
  viewedDialogueKeys: string[];
  usedToolKeys: string[];
  flags: Record<string, unknown>;
}

export interface SceneMapState {
  id: number;
  key: string;
  title: string;
  width: number;
  height: number;
  theme: string;
  spawnX: number;
  spawnY: number;
  ambient: Record<string, unknown>;
}

export interface PlayerState {
  x: number;
  y: number;
}

export interface MapObjectState {
  key: string;
  label: string;
  type: 'PERSON' | 'OBJECT' | 'ROUTE' | 'TOOL' | 'WARNING' | 'EXIT';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  icon: string;
  shortCode: string;
  collision: boolean;
  interactionPrompt: string;
  interactionText: string;
  decisionOptionId: number | null;
  toolCode: string | null;
  dialogue: DialogueState | null;
  /** B1 movement passthrough — additive; backend may omit on older payloads. */
  movementPattern?: Record<string, unknown>;
  facing?: string;
  metadata?: Record<string, unknown>;
}

export interface CollisionZoneState {
  key: string;
  label: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ClinicalToolState {
  code: string;
  label: string;
  icon: string;
  category: string;
  description: string;
  active: boolean;
}

export interface DialogueState {
  key: string;
  speakerName: string;
  portraitKey: string | null;
  emotion: string;
  lines: DialogueLineState[];
  choices: DialogueChoiceState[];
}

export interface DialogueLineState {
  order: number;
  speakerName: string;
  text: string;
  emotion: string;
}

export interface DialogueChoiceState {
  key: string;
  text: string;
  decisionOptionId: number | null;
  requiredToolCode: string | null;
  effect: Record<string, unknown>;
  /** UI hint: highlight choice as clinically recommended (optional, backend may omit) */
  isRecommended?: boolean;
  /** UI hint: highlight choice as clinically prohibited (optional, backend may omit) */
  isProhibited?: boolean;
  /** UI: la decisión se tomaría con información incompleta (gating frontend, Fase 9). */
  evidenceWarning?: string;
}

export interface InteractionResult {
  world: SimulationWorldState;
  interaction: MapObjectState;
  dialogue: DialogueState | null;
  preparedDecisionOptionId: number | null;
  unlockedToolCode: string | null;
}

/**
 * Fase 6 — Contextual feedback when a clinical tool is used.
 * The stress delta and feedback message make the tool usage diegetic.
 */
export interface ToolUseResult {
  world: SimulationWorldState;
  toolCode: string;
  targetKey: string | null;
  pertinent: boolean;
  stressDelta: number;
  feedbackMessage: string;
}

export interface AttemptTrace {
  attemptId: string;
  studentAlias: string;
  caseTitle: string;
  status: string;
  accumulatedScore: number;
  stressIndex: number;
  metrics: SimulationMetrics;
  startedAt: string;
  endedAt: string | null;
  totalDurationSeconds: number | null;
  phaseDurations: PhaseDuration[];
  adequateDecisions: number;
  riskyDecisions: number;
  inadequateDecisions: number;
  prohibitedDecisions: number;
  safeExitUsed: boolean;
  timeline: AttemptTimelineEntry[];
  visitedNodeTitles: string[];
  events: TraceEvent[];
  world: SimulationWorldState;
  reflections: ReflectionTrace[];
  rubricEvaluations: RubricSummary[];
}

export interface TraceEvent {
  type: string;
  classification: string | null;
  nodeTitle: string | null;
  decisionText: string | null;
  scoreDelta: number;
  stressDelta: number;
  detail: string | null;
  occurredAt: string;
}

export interface ReflectionTrace {
  nodeId: number;
  nodeTitle: string;
  text: string;
  locked: boolean;
}

export interface RubricSummary {
  id: number;
  rubricName: string;
  totalScore: number;
  comment: string | null;
  evaluatedAt: string;
}

export interface RecentAttempt {
  attemptId: string;
  studentAlias: string;
  caseTitle: string;
  status: string;
  accumulatedScore: number;
  stressIndex: number;
  startedAt: string;
}

export interface StudentAttemptSummary {
  attemptId: string;
  caseVersionId: number;
  caseTitle: string;
  status: SimulationAttemptState['status'];
  accumulatedScore: number;
  adequateDecisions: number;
  riskyDecisions: number;
  inadequateDecisions: number;
  prohibitedDecisions: number;
  totalDurationSeconds: number | null;
  startedAt: string;
  endedAt: string | null;
}

export interface RubricEvaluationView {
  rubricId: number;
  rubricName: string;
  description: string | null;
  criteria: RubricCriterionView[];
  scores: CriterionScoreView[];
  totalScore: number | null;
  comment: string | null;
}

export interface RubricCriterionView {
  id: number;
  competency: string;
  title: string;
  description: string | null;
  maxScore: number;
  displayOrder: number;
}

export interface CriterionScoreView {
  criterionId: number;
  score: number;
  comment: string | null;
  evidence: Record<string, unknown>;
}

// ─── Editor-specific states (include DB ids for CRUD) ─────────────────────────

export interface NodeEditorState {
  id: number;
  key: string;
  title: string;
  narrative: string;
  supportResources: string[];
  requiredTools: string[];
  sensitiveContent: boolean;
  safeExitRequired: boolean;
  warningMessage: string | null;
  terminal: boolean;
  startNode: boolean;
  positionX: number | null;
  positionY: number | null;
}

export interface DecisionEdgeState {
  id: number;
  optionKey: string;
  sourceNodeId: number;
  sourceKey: string;
  targetNodeId: number;
  targetKey: string;
  text: string;
  classification: 'ADEQUATE' | 'RISKY' | 'INADEQUATE';
  prohibitedConduct: boolean;
  prohibitionReason: string | null;
  scoreDelta: number;
  stressDelta: number;
  prohibitedPenalty: number;
  immediateFeedback: string;
}

export interface MapEditorState {
  id: number;
  key: string;
  title: string;
  width: number;
  height: number;
  theme: string;
  spawnX: number;
  spawnY: number;
  nodeId: number;
  nodeKey: string;
}

export interface MapObjectEditorState {
  id: number;
  key: string;
  label: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  colorHex: string;
  icon: string;
  shortCode: string;
  collision: boolean;
  visible: boolean;
  interactionPrompt: string;
  interactionText: string;
  decisionOptionId: number | null;
  toolCode: string | null;
  mapId: number;
}

export interface ClinicalToolEditorState {
  id: number;
  code: string;
  label: string;
  icon: string;
  category: string;
  description: string;
  active: boolean;
}

export interface CaseEditorView {
  caseVersionId: number;
  title: string;
  semanticVersion: string;
  status: string;
  nodes: NodeEditorState[];
  decisions: DecisionEdgeState[];
  maps: MapEditorState[];
  objects: MapObjectEditorState[];
  tools: ClinicalToolEditorState[];
  rubrics: RubricEvaluationView[];
  checklistCompletion: number;
  publishable: boolean;
}

// ─── Authoring CRUD request models ────────────────────────────────────────────

export interface NodeUpsertRequest {
  nodeKey: string;
  title: string;
  narrative: string;
  requiredTools: string[];
  supportResources: string[];
  sensitiveContent: boolean;
  safeExitRequired: boolean;
  warningMessage: string | null;
  terminal: boolean;
  startNode: boolean;
  positionX: number | null;
  positionY: number | null;
}

export interface DecisionOptionUpsertRequest {
  sourceNodeId: number;
  targetNodeId: number;
  optionKey: string;
  text: string;
  classification: string;
  prohibitedConduct: boolean;
  prohibitionReason: string | null;
  scoreDelta: number;
  stressDelta: number;
  prohibitedPenalty: number;
  immediateFeedback: string;
}

export interface MapUpsertRequest {
  nodeId: number;
  mapKey: string;
  title: string;
  width: number;
  height: number;
  theme: string;
  spawnX: number;
  spawnY: number;
}

export interface MapObjectUpsertRequest {
  objectKey: string;
  label: string;
  objectType: string;
  x: number;
  y: number;
  width: number;
  height: number;
  colorHex: string;
  icon: string;
  shortCode: string;
  collision: boolean;
  visible: boolean;
  interactionPrompt: string;
  interactionText: string;
  decisionOptionId: number | null;
  toolCode: string | null;
}

export interface ToolUpsertRequest {
  toolCode: string;
  label: string;
  icon: string;
  category: string;
  description: string;
}

export interface ChecklistUpdateRequest {
  contentOriginal: boolean;
  ethicsReviewed: boolean;
  safetyProtocols: boolean;
  noStigmatizing: boolean;
  triggerWarnings: boolean;
  accessibilityOk: boolean;
}

// ─── WorldDefinition v2 — contrato canónico entre editor y juego (Fase 2) ────

export interface WorldValidationIssue {
  severity: 'ERROR' | 'WARNING';
  code: string;
  message: string;
  entityRef: string | null;
}

export interface WorldValidationState {
  errors: WorldValidationIssue[];
  warnings: WorldValidationIssue[];
  canPublish: boolean;
}

export interface SceneMapDefinition {
  id: number;
  key: string;
  title: string;
  width: number;
  height: number;
  theme: string;
  spawnX: number;
  spawnY: number;
  ambient: Record<string, unknown>;
}

export type WorldObjectType = 'PERSON' | 'PROP' | 'TOOL_TARGET' | 'EXIT' | 'TRIGGER' | 'NOTE' | 'RESOURCE'
  | 'OBJECT' | 'ROUTE' | 'TOOL' | 'WARNING';

export interface WorldObject {
  id: number;
  key: string;
  label: string;
  type: WorldObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  facing: 'down' | 'up' | 'left' | 'right';
  colorHex: string;
  icon: string;
  shortCode: string;
  collision: boolean;
  visible: boolean;
  interactionPrompt: string;
  interactionText: string;
  decisionOptionId: number | null;
  toolCode: string | null;
  unlockCondition: Record<string, unknown>;
  movementPattern: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface WorldCollisionZone {
  id: number;
  key: string;
  label: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WorldDialogueLine {
  order: number;
  speakerName: string;
  text: string;
  emotion: string;
}

export interface WorldDialogueChoice {
  key: string;
  text: string;
  decisionOptionId: number | null;
  requiredToolCode: string | null;
  effect: Record<string, unknown>;
  displayOrder: number;
}

export interface WorldDialogueTree {
  id: number;
  key: string;
  speakerName: string;
  portraitKey: string | null;
  emotion: string;
  mapObjectId: number | null;
  /** Clave estable del objeto dueño; usada al guardar para resolver objetos nuevos sin id. */
  mapObjectKey?: string;
  lines: WorldDialogueLine[];
  choices: WorldDialogueChoice[];
}

export interface WorldClinicalTool {
  id: number;
  code: string;
  label: string;
  icon: string;
  category: string;
  description: string;
  active: boolean;
}

export interface SafeExitConfig {
  configured: boolean;
  exitObjectKey: string | null;
  supportResources: string[];
}

export interface WorldDefinition {
  schemaVersion: number;
  caseVersionId: number;
  revision: number;
  nodeId: number;
  map: SceneMapDefinition;
  objects: WorldObject[];
  collisionZones: WorldCollisionZone[];
  dialogues: WorldDialogueTree[];
  clinicalTools: WorldClinicalTool[];
  safeExit: SafeExitConfig;
  validation: WorldValidationState;
  /** Decisiones salientes del nodo de este mapa (para cablear opciones de respuesta). */
  availableDecisions: WorldOutgoingDecision[];
  /** Todas las salas (mapas) del caso — para puertas y switcher (Fase 3). */
  rooms: WorldRoom[];
}

export interface WorldOutgoingDecision {
  id: number;
  optionKey: string;
  text: string;
  classification: 'ADEQUATE' | 'RISKY' | 'INADEQUATE';
  targetNodeKey: string;
  prohibitedConduct: boolean;
}

export interface WorldRoom {
  nodeId: number;
  nodeKey: string;
  mapKey: string;
  title: string;
}

export interface WorldSaveRequest {
  revision: number;
  map: SceneMapDefinition;
  objects: WorldObject[];
  collisionZones: WorldCollisionZone[];
  dialogues: WorldDialogueTree[];
  clinicalTools: WorldClinicalTool[];
}

// ─── Multi-Room + NPC System (Plan 2) ─────────────────────────────────────────

export interface ScenarioConfig {
  scenarioKey: string;   // matches the mapa_key used by the backend
  startRoomKey: string;  // which room the player starts in
  rooms: RoomConfig[];
}

export interface RoomConfig {
  key: string;             // unique within this scenario
  tiledMapKey: string;     // key used in Phaser's asset cache (e.g. 'comisaria-sala-espera')
  tiledJsonPath: string;   // path relative to assets root (for preload)
  displayName: string;     // shown in title text pinned to screen
  spawnX: number;          // default player spawn x (world pixels, not tiles)
  spawnY: number;
  exits: RoomExitConfig[];
  npcs: NpcConfig[];
}

export interface RoomExitConfig {
  /** Name of the EXIT-type object in the Tiled Objects layer */
  objectName: string;
  targetRoomKey: string;
  /** Player spawn position in the target room when arriving via this exit */
  entryX: number;
  entryY: number;
}

// ─── NPC modular (flujo competitivo) ──────────────────────────────────────────

export type NpcAvatarPresetKey =
  | 'madre-vbg'
  | 'paciente-vbg'
  | 'colega-clinica'
  | 'supervisor-clinico'
  | 'seguridad'
  | 'adolescente-nna'
  | 'psicologa-hospitalaria'
  | 'funcionaria-recepcion'
  | 'comisaria-profesional';

export type NpcMotionBehavior =
  | 'idle'
  | 'subtle-wander'
  | 'pace'
  | 'patrol'
  | 'avoidant'
  | 'attentive';

export interface NpcMotionAnchor {
  x: number;
  y: number;
  pauseMs?: number;
  face?: 'down' | 'up' | 'left' | 'right';
}

export interface NpcMovementZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NpcMotionConfig {
  behavior: NpcMotionBehavior;
  zone?: NpcMovementZone;
  anchors?: NpcMotionAnchor[];
  radius?: number;
  speed?: number;
  pauseMs?: number;
  startDelayMs?: number;
}

export interface NpcConfig {
  key: string;
  npcType: 'supervisor' | 'colleague' | 'family' | 'witness';
  displayName: string;
  /** Emoji used as portrait in dialogue panel */
  portrait: string;
  x: number;
  y: number;
  /** Phaser frame index in the 'characters' spritesheet */
  frameIndex: number;
  dialogue: NpcDialogue;
  /** Preset modular (mismo universo visual que el avatar). Si falta → sprite legacy. */
  avatarPresetKey?: NpcAvatarPresetKey;
  motion?: NpcMotionConfig;
  facing?: 'down' | 'up' | 'left' | 'right';
  /** Override de escala de render (default: el del preset). */
  scale?: number;
  emotion?: 'neutral' | 'calm' | 'worried' | 'anxious' | 'receptive' | 'closed';
}

export interface NpcDialogue {
  lines: NpcDialogueLine[];
}

export interface NpcDialogueLine {
  text: string;
  emotion?: string;
}

// ─── Patient Reactive System (Plan 3) ─────────────────────────────────────────

export interface PatientState {
  /** Overall emotional wellbeing: 0 = crisis, 100 = stable/open. Starts at 40. */
  emotionalState: number;
  /** Trust in the professional: 0 = none, 100 = full. Starts at 20. */
  trustLevel: number;
  /** Willingness to open up: 0 = closed, 100 = fully open. Starts at 15. */
  openness: number;
  /** Crisis intensity: 0 = resolved, 100 = acute crisis. Starts at 60. */
  crisisLevel: number;
}

export interface PatientStateDelta {
  emotionalState?: number;
  trustLevel?: number;
  openness?: number;
  crisisLevel?: number;
}

/** Patient deltas keyed by decision classification. `prohibited` overrides classification. */
export interface InterventionRuleSet {
  byClassification: {
    ADEQUATE:   PatientStateDelta;
    RISKY:      PatientStateDelta;
    INADEQUATE: PatientStateDelta;
  };
  prohibited: PatientStateDelta;
}

export type OutcomeTier = 'excelente' | 'adecuado' | 'riesgo' | 'crisis_no_manejada';

export interface SimulationOutcome {
  tier: OutcomeTier;
  patientFinalState: PatientState;
  scoreTotal: number;
  feedbackNarrative: string;
  keyDecisions: string[];
}
