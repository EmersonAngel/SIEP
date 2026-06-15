/**
 * WorldEditorComponent — Fase 4: Editor de mundo MVP (Konva + Angular Signals)
 *
 * Visual authoring of world maps using Konva canvas:
 *   - Grid/zoom/pan/snap
 *   - Select/move/resize objects and collision zones
 *   - Create objects, persons, collisions, triggers
 *   - Define spawn and safe exit
 *   - Side inspector (liquid-glass)
 *   - Save draft (debounced auto-save + manual)
 *   - Validate button
 *   - Undo/Redo (command stack)
 *
 * Coordinates in PIXELS (Decision #5 — WYSIWYG with Phaser runtime).
 */
import {
  Component,
  ElementRef,
  OnInit,
  OnDestroy,
  ViewChild,
  inject,
  input,
  effect,
  signal,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import Konva from 'konva';
import { AvatarConfig, EYES, HairVariantId, MOUTHS } from '../../character/avatar.model';
import { AvatarFigureComponent } from '../../character/avatar-figure.component';
import { coerceAvatar, defaultAvatar, hairVariantId, hairVariantPatch } from '../../character/avatar-config.util';

import {
  WorldEditorStore,
  EditorTool,
  PlaceObjectCommand,
  MoveObjectCommand,
  DeleteObjectCommand,
  UpdateInspectorCommand,
  PlaceCollisionZoneCommand,
  DeleteCollisionZoneCommand,
  ResizeZoneCommand,
  UpdateSpawnCommand,
  UpsertDialogueCommand,
  DeleteDialogueCommand,
  SetMapAmbientCommand,
  SetMapFieldsCommand
} from './world-editor.store';
import {
  WorldObject,
  WorldObjectType,
  WorldCollisionZone,
  WorldValidationState,
  WorldDialogueTree,
  WorldDialogueLine,
  WorldDialogueChoice
} from '../../../core/models/simulation.model';
import {
  patrolPoints, wanderRadius, setPatternType, setWanderRadius,
  withPatrolPoint, movePatrolPoint, removePatrolPoint, reorderPatrolPoint
} from './path-edit.util';
import {
  doorTarget, setDoorTarget, doorEntry, setDoorEntry,
  cameraZoom, setCameraZoom, backgroundImage, setBackgroundImage
} from './room-edit.util';
import {
  AUTHORING_HAIR_VARIANTS,
  AUTHORING_NPC_TEMPLATES,
  AUTHORING_OBJECT_TEMPLATES,
  AUTHORING_SCENE_TEMPLATES,
  applySceneTemplate,
  buildObjectFromTemplate,
  objectTemplateById,
  selectedSceneTemplateId,
} from '../authoring-catalog.config';

// ─── Constants ──────────────────────────────────────────────────────────────

const GRID_SIZE = 16;
const SNAP_THRESHOLD = 8;
const OBJECT_COLORS: Record<string, string> = {
  PERSON: '#4f7cac',
  OBJECT: '#4fa3a5',
  PROP: '#4fa3a5',
  TOOL: '#6a8e5e',
  TOOL_TARGET: '#6a8e5e',
  EXIT: '#a85064',
  WARNING: '#c6a850',
  ROUTE: '#7a6f9e',
  TRIGGER: '#9e8f6f',
  NOTE: '#8fa3b8',
  RESOURCE: '#5e8e6a'
};

@Component({
  selector: 'app-world-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatProgressBarModule, AvatarFigureComponent],
  providers: [WorldEditorStore],
  template: `
    <div class="we-root">
      <!-- ── Toolbar ─────────────────────────────────────────────────── -->
      <header class="we-toolbar liquid-glass">
        <div class="we-tools">
          <button class="we-tool-btn" [class.active]="store.activeTool() === 'select'"
                  (click)="store.setTool('select')" title="Seleccionar (V)">
            <mat-icon>near_me</mat-icon>
          </button>
          <button class="we-tool-btn" [class.active]="store.activeTool() === 'pan'"
                  (click)="store.setTool('pan')" title="Mover lienzo (H)">
            <mat-icon>pan_tool</mat-icon>
          </button>
          <span class="we-divider"></span>
          <button class="we-tool-btn" [class.active]="store.activeTool() === 'place-object'"
                  (click)="store.setTool('place-object')" title="Colocar objeto (O)">
            <mat-icon>add_location_alt</mat-icon>
          </button>
          <button class="we-tool-btn" [class.active]="store.activeTool() === 'place-collision'"
                  (click)="store.setTool('place-collision')" title="Zona de colision (C)">
            <mat-icon>crop_free</mat-icon>
          </button>
          <button class="we-tool-btn" [class.active]="store.activeTool() === 'place-spawn'"
                  (click)="store.setTool('place-spawn')" title="Punto de spawn (S)">
            <mat-icon>my_location</mat-icon>
          </button>
        </div>

        <div class="we-actions">
          <button class="we-tool-btn" [disabled]="!store.canUndo()" (click)="store.undo()" title="Deshacer (Ctrl+Z)">
            <mat-icon>undo</mat-icon>
          </button>
          <button class="we-tool-btn" [disabled]="!store.canRedo()" (click)="store.redo()" title="Rehacer (Ctrl+Y)">
            <mat-icon>redo</mat-icon>
          </button>
          <span class="we-divider"></span>
          <span class="we-zoom-label">{{ (store.zoom() * 100) | number:'1.0-0' }}%</span>
          <button class="we-tool-btn" (click)="zoomIn()" title="Acercar (+)"><mat-icon>zoom_in</mat-icon></button>
          <button class="we-tool-btn" (click)="zoomOut()" title="Alejar (-)"><mat-icon>zoom_out</mat-icon></button>
          <button class="we-tool-btn" (click)="zoomFit()" title="Ajustar (0)"><mat-icon>fit_screen</mat-icon></button>
          <span class="we-divider"></span>
          <button class="psy-button psy-button--glass" (click)="store.validate()" type="button">
            <mat-icon>verified</mat-icon>Validar
          </button>
          <button class="psy-button psy-button--primary" (click)="store.saveNow()" type="button"
                  [disabled]="store.saving() || !store.dirty()">
            <mat-icon>{{ store.saving() ? 'hourglass_empty' : 'save' }}</mat-icon>
            {{ store.saving() ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>

        <div class="we-status">
          @if (store.dirty()) {
            <span class="we-badge we-badge--dirty">Sin guardar</span>
          }
          @if (store.saving()) {
            <span class="we-badge we-badge--saving">Guardando...</span>
          }
          <span class="we-info">
            {{ store.objectCount() }} objetos · {{ store.zoneCount() }} zonas
          </span>
        </div>
      </header>

      <section class="we-library liquid-glass" aria-label="Biblioteca de autoria">
        <div class="we-library-group">
          <span>Escenario</span>
          <select [ngModel]="selectedSceneTemplate()" (ngModelChange)="applyScenePreset($event)">
            <option value="">Personalizado</option>
            @for (scene of sceneTemplates; track scene.id) {
              <option [value]="scene.id">{{ scene.label }}</option>
            }
          </select>
        </div>
        <div class="we-library-actions">
          @for (template of objectTemplates; track template.id) {
            <button class="we-template-btn" type="button" (click)="addTemplate(template.id)">
              <mat-icon>{{ template.icon }}</mat-icon>
              <span>{{ template.label }}</span>
            </button>
          }
        </div>
      </section>

      @if (store.loading()) {
        <mat-progress-bar mode="indeterminate" />
      }

      @if (store.error()) {
        <div class="we-error" role="alert">
          <mat-icon>error</mat-icon>
          <span>{{ store.error() }}</span>
          @if (store.conflictDetected()) {
            <button class="psy-button psy-button--glass" (click)="store.reloadAfterConflict()" type="button">
              <mat-icon>refresh</mat-icon>Recargar
            </button>
          }
        </div>
      }

      <!-- ── Canvas + Inspector layout ─────────────────────────────── -->
      <div class="we-layout">
        <div class="we-canvas-wrap" #canvasWrap>
          <div #konvaHost class="we-konva-host"></div>
        </div>

        <!-- ── Side Inspector ──────────────────────────────────────── -->
        <aside class="we-inspector liquid-glass">
          <!-- ── Sala: switcher + zoom + fondo ────────────────────── -->
          @if (store.editorState()) {
            <div class="we-room">
              <h4>Sala</h4>
              @if (store.rooms().length > 1) {
                <label><span>Sala actual</span>
                  <select [ngModel]="store.definition()?.nodeId" (ngModelChange)="switchRoom($event)">
                    @for (r of store.rooms(); track r.nodeId) {
                      <option [ngValue]="r.nodeId">{{ r.nodeKey }} — {{ r.title }}</option>
                    }
                  </select>
                </label>
              }
              <label><span>Zoom de cámara ({{ roomZoom() | number:'1.2-2' }}×)</span>
                <input type="range" min="0.25" max="4" step="0.05" [ngModel]="roomZoom()"
                       (ngModelChange)="setRoomZoom($event)" />
              </label>
              <label><span>Imagen de fondo (URL)</span>
                <input [ngModel]="roomBg()" (ngModelChange)="setRoomBg($event)" placeholder="assets/… o https://…" />
              </label>
            </div>
          }
          @if (store.selectedObject(); as obj) {
            <h4>Objeto: {{ obj.label }}</h4>
            <div class="we-form">
              <label><span>Clave</span><input [ngModel]="obj.key" disabled /></label>
              <label><span>Etiqueta</span>
                <input [ngModel]="obj.label" (ngModelChange)="updateObjectField(obj.key, 'label', $event)" />
              </label>
              <label><span>Tipo</span>
                <select [ngModel]="obj.type" (ngModelChange)="updateObjectField(obj.key, 'type', $event)">
                  <option value="PERSON">Persona</option>
                  <option value="OBJECT">Objeto</option>
                  <option value="PROP">Prop</option>
                  <option value="TOOL">Herramienta</option>
                  <option value="EXIT">Salida</option>
                  <option value="WARNING">Alerta</option>
                  <option value="ROUTE">Ruta</option>
                  <option value="TRIGGER">Trigger</option>
                </select>
              </label>
              <div class="we-form-row">
                <label><span>X</span><input type="number" [ngModel]="obj.x"
                  (ngModelChange)="updateObjectField(obj.key, 'x', $event)" /></label>
                <label><span>Y</span><input type="number" [ngModel]="obj.y"
                  (ngModelChange)="updateObjectField(obj.key, 'y', $event)" /></label>
              </div>
              <div class="we-form-row">
                <label><span>Ancho</span><input type="number" [ngModel]="obj.width"
                  (ngModelChange)="updateObjectField(obj.key, 'width', $event)" /></label>
                <label><span>Alto</span><input type="number" [ngModel]="obj.height"
                  (ngModelChange)="updateObjectField(obj.key, 'height', $event)" /></label>
              </div>
              <label><span>Prompt</span>
                <input [ngModel]="obj.interactionPrompt" (ngModelChange)="updateObjectField(obj.key, 'interactionPrompt', $event)" />
              </label>
              <label><span>Codigo corto</span>
                <input [ngModel]="obj.shortCode" maxlength="12" (ngModelChange)="updateObjectField(obj.key, 'shortCode', $event)" />
              </label>
              <label><span>Color</span>
                <input type="color" [ngModel]="obj.colorHex" (ngModelChange)="updateObjectField(obj.key, 'colorHex', $event)" />
              </label>
              <label class="we-check">
                <input type="checkbox" [ngModel]="obj.collision" (ngModelChange)="updateObjectField(obj.key, 'collision', $event)" />
                <span>Colision activa</span>
              </label>
              <label class="we-check">
                <input type="checkbox" [ngModel]="obj.visible" (ngModelChange)="updateObjectField(obj.key, 'visible', $event)" />
                <span>Visible</span>
              </label>
              @if (obj.type === 'PERSON') {
                <div class="we-npc-kit">
                  <div class="we-npc-head">
                    <h4>NPC</h4>
                    <div class="we-npc-preview" aria-hidden="true">
                      <app-avatar-figure [config]="npcAvatar(obj)" pose="front" />
                      <app-avatar-figure [config]="npcAvatar(obj)" pose="side" />
                    </div>
                  </div>
                  <label><span>Genero</span>
                    <select [ngModel]="npcGender(obj)" (ngModelChange)="setNpcGender(obj.key, $event)">
                      <option value="female">Mujer</option>
                      <option value="male">Hombre</option>
                      <option value="neutral">Neutral</option>
                    </select>
                  </label>
                  <label><span>Plantilla</span>
                    <select [ngModel]="npcTemplateId(obj)" (ngModelChange)="applyNpcTemplate(obj.key, $event)">
                      <option value="">Personalizado</option>
                      @for (tpl of npcTemplates; track tpl.id) {
                        <option [value]="tpl.id">{{ tpl.label }}</option>
                      }
                    </select>
                  </label>
                  <label><span>Pelo</span>
                    <select [ngModel]="npcHairVariant(obj)" (ngModelChange)="setNpcHair(obj.key, $event)">
                      @for (hair of hairVariants; track hair.id) {
                        <option [value]="hair.id">{{ hair.label }}</option>
                      }
                    </select>
                  </label>
                  <div class="we-form-row">
                    <label><span>Cara</span>
                      <select [ngModel]="npcAvatar(obj).mouth" (ngModelChange)="setNpcAvatarField(obj.key, 'mouth', $event)">
                        @for (mouth of mouthOptions; track mouth.id) {
                          <option [value]="mouth.id">{{ mouth.label }}</option>
                        }
                      </select>
                    </label>
                    <label><span>Ojos</span>
                      <select [ngModel]="npcAvatar(obj).eyes" (ngModelChange)="setNpcAvatarField(obj.key, 'eyes', $event)">
                        @for (eyes of eyeOptions; track eyes.id) {
                          <option [value]="eyes.id">{{ eyes.label }}</option>
                        }
                      </select>
                    </label>
                  </div>
                </div>
              }
              <button class="psy-button psy-button--ghost we-delete-btn" (click)="deleteSelected()" type="button">
                <mat-icon>delete_outline</mat-icon>Eliminar objeto
              </button>
            </div>
            <!-- ── Diálogo del objeto ───────────────────────────────── -->
            <div class="we-dialogue">
              @if (store.selectedDialogue(); as dlg) {
                <div class="we-dialogue-head">
                  <h4>Diálogo</h4>
                  <button class="we-del" (click)="removeDialogue()" type="button" title="Quitar diálogo">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </div>
                <label><span>Hablante</span>
                  <input [ngModel]="dlg.speakerName" (ngModelChange)="updateDialogueField('speakerName', $event)" />
                </label>
                <label><span>Emoción</span>
                  <input [ngModel]="dlg.emotion" (ngModelChange)="updateDialogueField('emotion', $event)" />
                </label>

                <div class="we-sub">
                  <span class="we-sub-title">Líneas</span>
                  <button class="we-add" (click)="addLine()" type="button"><mat-icon>add</mat-icon></button>
                </div>
                @for (line of dlg.lines; track $index) {
                  <div class="we-row">
                    <input [ngModel]="line.text" (ngModelChange)="updateLine($index, $event)"
                           placeholder="Lo que dice el NPC…" />
                    <button class="we-del" (click)="removeLine($index)" type="button"><mat-icon>close</mat-icon></button>
                  </div>
                }

                <div class="we-sub">
                  <span class="we-sub-title">Opciones de respuesta</span>
                  <button class="we-add" (click)="addChoice()" type="button"><mat-icon>add</mat-icon></button>
                </div>
                @for (choice of dlg.choices; track choice.key) {
                  <div class="we-choice">
                    <input [ngModel]="choice.text" (ngModelChange)="updateChoiceText($index, $event)"
                           placeholder="Respuesta del estudiante…" />
                    <select [ngModel]="choice.decisionOptionId"
                            (ngModelChange)="setChoiceDecision($index, $event)">
                      <option [ngValue]="null">— sin destino —</option>
                      @for (dec of store.availableDecisions(); track dec.id) {
                        <option [ngValue]="dec.id">{{ dec.classification }} → {{ dec.targetNodeKey }}: {{ dec.text }}</option>
                      }
                    </select>
                    <button class="we-del" (click)="removeChoice($index)" type="button"><mat-icon>close</mat-icon></button>
                    <div class="we-choice-reqs">
                      <label><span>Herramienta obligatoria</span>
                        <select [ngModel]="choice.requiredToolCode" (ngModelChange)="setChoiceRequiredTool($index, $event)">
                          <option [ngValue]="null">Sin requisito</option>
                          @for (tool of store.definition()?.clinicalTools ?? []; track tool.code) {
                            <option [value]="tool.code">{{ tool.code }} - {{ tool.label }}</option>
                          }
                        </select>
                      </label>
                      <label><span>Debe hablar con NPCs</span>
                        <input [ngModel]="choiceEvidenceList(choice, 'requiresNpcs')" (ngModelChange)="setChoiceEvidenceList($index, 'requiresNpcs', $event)" placeholder="enfermera, testigo" />
                      </label>
                      <label><span>Debe revisar objetos</span>
                        <input [ngModel]="choiceEvidenceList(choice, 'requiresInspected')" (ngModelChange)="setChoiceEvidenceList($index, 'requiresInspected', $event)" placeholder="historia-clinica" />
                      </label>
                      <label><span>Debe tener/usar herramientas</span>
                        <input [ngModel]="choiceEvidenceList(choice, 'requiresTools')" (ngModelChange)="setChoiceEvidenceList($index, 'requiresTools', $event)" placeholder="PAP, RISK_METER" />
                      </label>
                    </div>
                  </div>
                }
              } @else {
                <button class="psy-button psy-button--glass" (click)="addDialogue()" type="button">
                  <mat-icon>chat_bubble_outline</mat-icon>Agregar diálogo
                </button>
              }
            </div>
            <!-- ── Movimiento del NPC ──────────────────────────────── -->
            <div class="we-movement">
              <h4>Movimiento</h4>
              <label><span>Tipo</span>
                <select [ngModel]="movementType(obj)" (ngModelChange)="setMovement(obj.key, $event)">
                  <option value="idle">Quieto</option>
                  <option value="wander">Deambular</option>
                  <option value="patrol">Ruta (patrol)</option>
                </select>
              </label>
              @if (movementType(obj) === 'wander') {
                <label><span>Radio</span>
                  <input type="number" min="1" [ngModel]="wanderRadiusOf(obj)"
                         (ngModelChange)="setRadius(obj.key, $event)" />
                </label>
              }
              @if (movementType(obj) === 'patrol') {
                <button class="psy-button psy-button--glass" (click)="store.pathEditMode.set(!store.pathEditMode())" type="button">
                  <mat-icon>{{ store.pathEditMode() ? 'check' : 'timeline' }}</mat-icon>
                  {{ store.pathEditMode() ? 'Listo' : 'Dibujar ruta' }}
                </button>
                <p class="we-hint">{{ store.pathEditMode() ? 'Clic en el lienzo para agregar waypoints.' : 'Activa y haz clic en el lienzo; arrastra los puntos para moverlos.' }}</p>
                @for (pt of patrolPointsOf(obj); track $index) {
                  <div class="we-wp-row">
                    <span class="we-wp-idx">{{ $index + 1 }}</span>
                    <span class="we-wp-xy">{{ pt[0] }}, {{ pt[1] }}</span>
                    <button class="we-del" (click)="moveWaypointOrder(obj.key, $index, -1)" type="button"><mat-icon>arrow_upward</mat-icon></button>
                    <button class="we-del" (click)="moveWaypointOrder(obj.key, $index, 1)" type="button"><mat-icon>arrow_downward</mat-icon></button>
                    <button class="we-del" (click)="deleteWaypoint(obj.key, $index)" type="button"><mat-icon>close</mat-icon></button>
                  </div>
                }
              }
            </div>
            <!-- ── Puerta (objeto EXIT) ─────────────────────────────── -->
            @if (obj.type === 'EXIT') {
              <div class="we-door">
                <h4>Puerta</h4>
                <label><span>Sala destino</span>
                  <select [ngModel]="doorTargetOf(obj)" (ngModelChange)="setDoorTargetFor(obj.key, $event)">
                    <option [ngValue]="''">— sin destino —</option>
                    @for (r of otherRooms(); track r.nodeId) {
                      <option [ngValue]="r.nodeKey">{{ r.nodeKey }} — {{ r.title }}</option>
                    }
                  </select>
                </label>
                <div class="we-form-row">
                  <label><span>Entrada X</span><input type="number" [ngModel]="doorEntryOf(obj)[0]"
                    (ngModelChange)="setDoorEntryFor(obj.key, +$event, doorEntryOf(obj)[1])" /></label>
                  <label><span>Entrada Y</span><input type="number" [ngModel]="doorEntryOf(obj)[1]"
                    (ngModelChange)="setDoorEntryFor(obj.key, doorEntryOf(obj)[0], +$event)" /></label>
                </div>
              </div>
            }
          } @else if (store.selectedZone(); as zone) {
            <h4>Zona: {{ zone.label || zone.key }}</h4>
            <div class="we-form">
              <label><span>Clave</span><input [ngModel]="zone.key" disabled /></label>
              <label><span>Etiqueta</span>
                <input [ngModel]="zone.label ?? ''" (ngModelChange)="updateZoneLabel(zone.key, $event)" />
              </label>
              <div class="we-form-row">
                <label><span>X</span><input type="number" [ngModel]="zone.x" disabled /></label>
                <label><span>Y</span><input type="number" [ngModel]="zone.y" disabled /></label>
              </div>
              <div class="we-form-row">
                <label><span>Ancho</span><input type="number" [ngModel]="zone.width" disabled /></label>
                <label><span>Alto</span><input type="number" [ngModel]="zone.height" disabled /></label>
              </div>
              <button class="psy-button psy-button--ghost we-delete-btn" (click)="deleteSelectedZone()" type="button">
                <mat-icon>delete_outline</mat-icon>Eliminar zona
              </button>
            </div>
          } @else {
            <div class="we-inspector-empty">
              <mat-icon>touch_app</mat-icon>
              <p>Selecciona un objeto o zona en el lienzo para editar sus propiedades.</p>
              <p class="we-hint">Atajos: V=seleccionar, O=objeto, C=colision, S=spawn, H=mover, Ctrl+Z/Y=undo/redo, Supr=eliminar</p>
            </div>
          }

          <!-- Validation panel -->
          @if (store.validationState(); as vs) {
            <div class="we-validation">
              <h4>
                <mat-icon>{{ vs.canPublish ? 'check_circle' : 'error' }}</mat-icon>
                Validacion
              </h4>
              @if (vs.errors.length) {
                <div class="we-val-section we-val-errors">
                  @for (issue of vs.errors; track issue.code) {
                    <div class="we-val-item">
                      <mat-icon>error</mat-icon>
                      <span>{{ issue.message }}</span>
                    </div>
                  }
                </div>
              }
              @if (vs.warnings.length) {
                <div class="we-val-section we-val-warnings">
                  @for (issue of vs.warnings; track issue.code) {
                    <div class="we-val-item">
                      <mat-icon>warning</mat-icon>
                      <span>{{ issue.message }}</span>
                    </div>
                  }
                </div>
              }
              @if (!vs.errors.length && !vs.warnings.length) {
                <p class="we-val-ok">Sin errores ni advertencias.</p>
              }
            </div>
          }
        </aside>
      </div>
    </div>
  `,
  styles: [`
    .we-root { display: grid; gap: 12px; }

    /* Toolbar */
    .we-toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      padding: 8px 14px;
      border-radius: 16px;
    }
    .we-tools, .we-actions { display: flex; gap: 4px; align-items: center; }
    .we-actions { margin-left: auto; }
    .we-tool-btn {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      border: 1px solid transparent;
      border-radius: 10px;
      background: transparent;
      color: var(--psy-muted);
      cursor: pointer;
      transition: all var(--psy-motion-fast);
    }
    .we-tool-btn:hover { background: rgba(79,124,172,.08); color: var(--psy-blue-deep); }
    .we-tool-btn.active {
      background: rgba(79,124,172,.14);
      border-color: rgba(79,124,172,.28);
      color: var(--psy-blue-deep);
    }
    .we-tool-btn:disabled { opacity: .35; pointer-events: none; }
    .we-tool-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .we-divider {
      display: block;
      width: 1px;
      height: 24px;
      background: var(--psy-border);
      margin: 0 4px;
    }
    .we-zoom-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: .76rem;
      font-weight: 700;
      color: var(--psy-muted);
      min-width: 42px;
      text-align: center;
    }
    .we-status {
      display: flex;
      gap: 8px;
      align-items: center;
      width: 100%;
      padding-top: 4px;
    }
    .we-library {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 14px;
    }
    .we-library-group {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: min(100%, 280px);
    }
    .we-library-group span {
      color: var(--psy-blue-deep);
      font-size: .78rem;
      font-weight: 800;
    }
    .we-library select {
      min-height: 34px;
      border: 1px solid rgba(79,124,172,.18);
      border-radius: 8px;
      background: rgba(255,255,255,.82);
      color: var(--psy-ink);
      font: inherit;
      font-size: .82rem;
      padding: 5px 8px;
    }
    .we-library-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .we-template-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 34px;
      padding: 6px 9px;
      border: 1px solid rgba(79,124,172,.18);
      border-radius: 8px;
      background: rgba(255,255,255,.78);
      color: var(--psy-blue-deep);
      font: inherit;
      font-size: .78rem;
      font-weight: 800;
      cursor: pointer;
    }
    .we-template-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .we-template-btn:hover {
      background: rgba(79,124,172,.1);
    }
    .we-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: .72rem;
      font-weight: 800;
    }
    .we-badge--dirty { background: rgba(198,168,80,.16); color: #7a6320; }
    .we-badge--saving { background: rgba(79,124,172,.12); color: var(--psy-blue-deep); }
    .we-info {
      font-size: .76rem;
      color: var(--psy-muted);
      font-family: 'JetBrains Mono', monospace;
    }

    /* Layout */
    .we-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 300px;
      gap: 14px;
      align-items: start;
    }
    .we-canvas-wrap {
      position: relative;
      border: 1px solid rgba(79,124,172,.16);
      border-radius: 16px;
      overflow: hidden;
      background: #f8fbfd;
      min-height: 400px;
    }
    .we-konva-host { width: 100%; height: 540px; }

    /* Inspector */
    .we-inspector {
      display: grid;
      gap: 14px;
      padding: 16px;
      border-radius: 18px;
      max-height: 80vh;
      overflow-y: auto;
    }
    .we-inspector h4 {
      margin: 0;
      font-family: 'Poppins', system-ui, sans-serif;
      letter-spacing: 0;
      font-size: 1.05rem;
      color: var(--psy-ink);
    }
    .we-form { display: grid; gap: 8px; }
    .we-form label {
      display: grid;
      gap: 3px;
      font-size: .82rem;
    }
    .we-form label > span { font-weight: 700; color: var(--psy-blue-deep); }
    .we-form input, .we-form select {
      padding: 6px 10px;
      border: 1px solid rgba(79,124,172,.18);
      border-radius: 8px;
      background: rgba(255,255,255,.8);
      font-size: .84rem;
      color: var(--psy-ink);
      font-family: inherit;
    }
    .we-form input:focus, .we-form select:focus {
      outline: none;
      border-color: var(--psy-blue);
      box-shadow: 0 0 0 2px var(--psy-focus);
    }
    .we-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .we-check {
      display: flex !important;
      align-items: center;
      gap: 8px;
      flex-direction: row !important;
    }
    .we-check input { width: auto; }
    .we-delete-btn { color: #8b3145 !important; margin-top: 6px; }

    .we-inspector-empty {
      display: grid;
      gap: 10px;
      text-align: center;
      padding: 20px 0;
      color: var(--psy-muted);
    }
    .we-inspector-empty mat-icon {
      justify-self: center;
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: rgba(79,124,172,.3);
    }
    .we-inspector-empty p { margin: 0; font-size: .84rem; line-height: 1.5; }
    .we-hint { font-size: .72rem !important; font-family: 'JetBrains Mono', monospace; }

    /* Validation */
    .we-validation {
      display: grid;
      gap: 10px;
      padding-top: 12px;
      border-top: 1px solid var(--psy-border);
    }
    .we-validation h4 {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .we-val-section { display: grid; gap: 6px; }
    .we-val-item {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      font-size: .8rem;
      line-height: 1.4;
    }
    .we-val-errors .we-val-item { color: #8b3145; }
    .we-val-errors mat-icon { color: #a85064; font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }
    .we-val-warnings .we-val-item { color: #7a6320; }
    .we-val-warnings mat-icon { color: #c6a850; font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }
    .we-val-ok { margin: 0; color: #2f7c5f; font-size: .84rem; }

    /* Error bar */
    .we-error {
      display: flex;
      gap: 10px;
      align-items: center;
      padding: 12px 16px;
      border-radius: 14px;
      background: rgba(168,80,98,.08);
      border: 1px solid rgba(168,80,98,.24);
      color: #8b3145;
      font-size: .88rem;
    }

    @media (max-width: 1000px) {
      .we-layout { grid-template-columns: 1fr; }
      .we-inspector { max-height: none; }
    }
    .we-dialogue { display: grid; gap: 8px; padding-top: 12px; margin-top: 8px; border-top: 1px solid var(--psy-border); }
    .we-dialogue-head { display: flex; align-items: center; justify-content: space-between; }
    .we-sub { display: flex; align-items: center; justify-content: space-between; margin-top: 6px; }
    .we-sub-title { font-weight: 700; color: var(--psy-blue-deep); font-size: .82rem; }
    .we-row, .we-choice { display: grid; grid-template-columns: 1fr auto; gap: 6px; align-items: center; }
    .we-choice { grid-template-columns: 1fr 1fr auto; }
    .we-choice-reqs {
      grid-column: 1 / -1;
      display: grid;
      gap: 6px;
      padding: 8px;
      border: 1px solid rgba(79,124,172,.12);
      border-radius: 10px;
      background: rgba(79,124,172,.05);
    }
    .we-choice-reqs label {
      display: grid;
      gap: 3px;
      font-size: .78rem;
    }
    .we-choice-reqs label > span {
      color: var(--psy-blue-deep);
      font-weight: 800;
    }
    .we-add, .we-del { display: grid; place-items: center; width: 28px; height: 28px; border: 1px solid var(--psy-border); border-radius: 8px; background: transparent; cursor: pointer; color: var(--psy-muted); }
    .we-add:hover, .we-del:hover { background: rgba(79,124,172,.08); color: var(--psy-blue-deep); }
    .we-choice select, .we-row input, .we-choice input { padding: 5px 8px; border: 1px solid rgba(79,124,172,.18); border-radius: 8px; background: rgba(255,255,255,.8); font: inherit; font-size: .82rem; }
    .we-npc-kit { display: grid; gap: 8px; padding: 10px; border: 1px solid rgba(79,124,172,.14); border-radius: 12px; background: rgba(255,255,255,.52); }
    .we-npc-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .we-npc-head h4 { margin: 0; font-size: .96rem; }
    .we-npc-preview { display: flex; align-items: center; gap: 4px; }
    .we-npc-preview app-avatar-figure { width: 36px; height: 54px; }
    .we-movement { display: grid; gap: 8px; padding-top: 12px; margin-top: 8px; border-top: 1px solid var(--psy-border); }
    .we-movement h4 { margin: 0; font-size: 1.05rem; color: var(--psy-ink); }
    .we-wp-row { display: grid; grid-template-columns: auto 1fr auto auto auto; gap: 6px; align-items: center; }
    .we-wp-idx { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 999px; background: rgba(122,111,158,.16); color: #5b5180; font-weight: 800; font-size: .72rem; }
    .we-wp-xy { font-family: 'JetBrains Mono', monospace; font-size: .76rem; color: var(--psy-muted); }
    .we-movement select, .we-movement input { padding: 5px 8px; border: 1px solid rgba(79,124,172,.18); border-radius: 8px; background: rgba(255,255,255,.8); font: inherit; font-size: .82rem; }
    .we-room { display: grid; gap: 8px; padding: 0 0 12px; margin-bottom: 8px; border-bottom: 1px solid var(--psy-border); }
    .we-room h4, .we-door h4 { margin: 0; font-size: 1.05rem; color: var(--psy-ink); }
    .we-room label, .we-door label { display: grid; gap: 3px; font-size: .82rem; }
    .we-room label > span, .we-door label > span { font-weight: 700; color: var(--psy-blue-deep); }
    .we-room select, .we-room input, .we-door select, .we-door input { padding: 5px 8px; border: 1px solid rgba(79,124,172,.18); border-radius: 8px; background: rgba(255,255,255,.8); font: inherit; font-size: .82rem; }
    .we-door { display: grid; gap: 8px; padding-top: 12px; margin-top: 8px; border-top: 1px solid var(--psy-border); }
  `]
})
export class WorldEditorComponent implements OnInit, OnDestroy {
  readonly store = inject(WorldEditorStore);

  readonly caseVersionId = input.required<number>();
  readonly nodeId = input<number>();
  readonly sceneTemplates = AUTHORING_SCENE_TEMPLATES;
  readonly objectTemplates = AUTHORING_OBJECT_TEMPLATES;
  readonly npcTemplates = AUTHORING_NPC_TEMPLATES;
  readonly hairVariants = AUTHORING_HAIR_VARIANTS;
  readonly mouthOptions = MOUTHS;
  readonly eyeOptions = EYES;

  @ViewChild('konvaHost', { static: false }) konvaHost!: ElementRef<HTMLDivElement>;
  @ViewChild('canvasWrap', { static: false }) canvasWrap!: ElementRef<HTMLDivElement>;

  private stage: Konva.Stage | null = null;
  private mainLayer: Konva.Layer | null = null;
  private gridLayer: Konva.Layer | null = null;
  private uiLayer: Konva.Layer | null = null;

  // Drawing state for collision zone creation
  private drawingZone = false;
  private drawStart = { x: 0, y: 0 };
  private drawRect: Konva.Rect | null = null;

  // Drag state for move commands
  private dragStart: { x: number; y: number } | null = null;

  // Spawn marker
  private spawnMarker: Konva.Group | null = null;

  constructor() {
    // Re-render Konva on editor-state OR selection changes
    // (the pattern overlay + selection highlight depend on the current selection).
    effect(() => {
      const state = this.store.editorState();
      this.store.selectedKey();
      if (state && this.stage) {
        this.renderWorld(state);
      }
    });
  }

  ngOnInit(): void {
    // Load happens after view init
  }

  ngAfterViewInit(): void {
    this.initKonva();
    this.store.load(this.caseVersionId(), this.nodeId());
  }

  ngOnDestroy(): void {
    this.stage?.destroy();
  }

  // ─── Keyboard shortcuts ───────────────────────────────────────────────

  @HostListener('window:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

    if (e.ctrlKey && e.key === 'z') { e.preventDefault(); this.store.undo(); }
    else if (e.ctrlKey && e.key === 'y') { e.preventDefault(); this.store.redo(); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { this.deleteSelected(); }
    else if (e.key === 'v' || e.key === 'V') { this.store.setTool('select'); }
    else if (e.key === 'o' || e.key === 'O') { this.store.setTool('place-object'); }
    else if (e.key === 'c' || e.key === 'C') { this.store.setTool('place-collision'); }
    else if (e.key === 's' && !e.ctrlKey) { this.store.setTool('place-spawn'); }
    else if (e.key === 'h' || e.key === 'H') { this.store.setTool('pan'); }
    else if (e.key === '+' || e.key === '=') { this.zoomIn(); }
    else if (e.key === '-') { this.zoomOut(); }
    else if (e.key === '0') { this.zoomFit(); }
  }

  // ─── Zoom controls ────────────────────────────────────────────────────

  zoomIn(): void {
    this.store.setZoom(this.store.zoom() + 0.15);
    this.applyZoom();
  }

  zoomOut(): void {
    this.store.setZoom(this.store.zoom() - 0.15);
    this.applyZoom();
  }

  zoomFit(): void {
    if (!this.stage || !this.canvasWrap) return;
    const state = this.store.editorState();
    if (!state) return;
    const wrapW = this.canvasWrap.nativeElement.clientWidth;
    const fitZoom = Math.min(wrapW / state.map.width, 540 / state.map.height, 2);
    this.store.setZoom(fitZoom);
    this.applyZoom();
  }

  // ─── Inspector actions ────────────────────────────────────────────────

  selectedSceneTemplate(): string {
    return selectedSceneTemplateId(this.store.editorState()?.map);
  }

  applyScenePreset(templateId: string): void {
    const state = this.store.editorState();
    const template = this.sceneTemplates.find(t => t.id === templateId);
    if (!state || !template) return;
    this.store.execute(new SetMapFieldsCommand(applySceneTemplate(state.map, template)));
  }

  addTemplate(templateId: string): void {
    const state = this.store.editorState();
    const template = objectTemplateById(templateId);
    if (!state || !template) return;
    const offset = state.objects.length * 8;
    const x = this.snapToGrid(Math.min(state.map.width - 64, state.map.spawnX + 64 + offset));
    const y = this.snapToGrid(Math.min(state.map.height - 64, state.map.spawnY + offset));
    const keyPrefix = template.type === 'PERSON' ? 'npc' : template.id;
    const obj = buildObjectFromTemplate(template, this.store.generateKey(keyPrefix), x, y, this.store.nextLocalId());
    this.store.execute(new PlaceObjectCommand(obj));
    this.store.select(obj.key);
  }

  updateObjectField(key: string, field: string, value: unknown): void {
    this.store.execute(new UpdateInspectorCommand(key, { [field]: value } as Partial<WorldObject>));
  }

  npcAvatar(obj: WorldObject): AvatarConfig {
    return coerceAvatar((obj.metadata as { avatar?: unknown } | undefined)?.avatar ?? defaultAvatar());
  }

  npcGender(obj: WorldObject): string {
    const gender = (obj.metadata as { gender?: unknown } | undefined)?.gender;
    return gender === 'male' || gender === 'neutral' ? gender : 'female';
  }

  npcTemplateId(obj: WorldObject): string {
    const id = (obj.metadata as { npcTemplateId?: unknown } | undefined)?.npcTemplateId;
    return typeof id === 'string' ? id : '';
  }

  npcHairVariant(obj: WorldObject): string {
    return hairVariantId(this.npcAvatar(obj));
  }

  private updateNpcMetadata(key: string, updates: Record<string, unknown>): void {
    const obj = this.store.selectedObject();
    if (!obj) return;
    this.store.execute(new UpdateInspectorCommand(key, {
      metadata: { ...(obj.metadata ?? {}), ...updates },
    }));
  }

  setNpcGender(key: string, gender: 'female' | 'male' | 'neutral'): void {
    this.updateNpcMetadata(key, { gender });
  }

  applyNpcTemplate(key: string, templateId: string): void {
    const template = this.npcTemplates.find(t => t.id === templateId);
    if (!template) return;
    this.updateNpcMetadata(key, {
      gender: template.gender,
      npcTemplateId: template.id,
      avatar: template.avatar,
    });
  }

  setNpcHair(key: string, variant: string): void {
    const obj = this.store.selectedObject();
    if (!obj) return;
    const avatar = { ...this.npcAvatar(obj), ...hairVariantPatch(variant as HairVariantId) };
    this.updateNpcMetadata(key, { npcTemplateId: '', avatar });
  }

  setNpcAvatarField(key: string, field: keyof AvatarConfig, value: string): void {
    const obj = this.store.selectedObject();
    if (!obj) return;
    this.updateNpcMetadata(key, {
      npcTemplateId: '',
      avatar: { ...this.npcAvatar(obj), [field]: value },
    });
  }

  updateZoneLabel(key: string, label: string): void {
    const state = this.store.editorState();
    if (!state) return;
    const zone = state.collisionZones.find(z => z.key === key);
    if (!zone) return;
    this.store.execute(new ResizeZoneCommand(key,
      { x: zone.x, y: zone.y, width: zone.width, height: zone.height },
      { x: zone.x, y: zone.y, width: zone.width, height: zone.height }
    ));
    // Update label directly since ResizeZoneCommand doesn't handle labels
    const updatedState = this.store.editorState();
    if (updatedState) {
      this.store.editorState.set({
        ...updatedState,
        collisionZones: updatedState.collisionZones.map(z =>
          z.key === key ? { ...z, label } : z
        )
      });
    }
  }

  deleteSelected(): void {
    const key = this.store.selectedKey();
    if (!key) return;
    if (this.store.selectedObject()) {
      this.store.execute(new DeleteObjectCommand(key));
    } else if (this.store.selectedZone()) {
      this.store.execute(new DeleteCollisionZoneCommand(key));
    }
    this.store.select(null);
  }

  deleteSelectedZone(): void {
    const key = this.store.selectedKey();
    if (!key) return;
    this.store.execute(new DeleteCollisionZoneCommand(key));
    this.store.select(null);
  }

  // ─── Dialogue authoring ───────────────────────────────────────────────
  private commit(tree: WorldDialogueTree): void {
    const obj = this.store.selectedObject();
    if (!obj) return;
    this.store.execute(new UpsertDialogueCommand(obj.key, tree));
  }

  addDialogue(): void {
    const obj = this.store.selectedObject();
    if (!obj) return;
    const tree: WorldDialogueTree = {
      id: this.store.nextLocalId(),
      key: `dlg-${obj.key}`,
      speakerName: obj.label,
      portraitKey: null,
      emotion: 'neutral',
      mapObjectId: obj.id ?? null,
      mapObjectKey: obj.key,
      lines: [],
      choices: []
    };
    this.commit(tree);
  }

  removeDialogue(): void {
    const obj = this.store.selectedObject();
    if (!obj) return;
    this.store.execute(new DeleteDialogueCommand(obj.key));
  }

  updateDialogueField(field: 'speakerName' | 'emotion', value: string): void {
    const tree = this.store.selectedDialogue();
    if (!tree) return;
    this.commit({ ...tree, [field]: value });
  }

  addLine(): void {
    const tree = this.store.selectedDialogue();
    if (!tree) return;
    const line: WorldDialogueLine = {
      order: tree.lines.length, speakerName: tree.speakerName, text: '', emotion: tree.emotion
    };
    this.commit({ ...tree, lines: [...tree.lines, line] });
  }

  updateLine(index: number, text: string): void {
    const tree = this.store.selectedDialogue();
    if (!tree) return;
    const lines = tree.lines.map((l, i) => i === index ? { ...l, text } : l);
    this.commit({ ...tree, lines });
  }

  removeLine(index: number): void {
    const tree = this.store.selectedDialogue();
    if (!tree) return;
    const lines = tree.lines.filter((_, i) => i !== index).map((l, i) => ({ ...l, order: i }));
    this.commit({ ...tree, lines });
  }

  addChoice(): void {
    const tree = this.store.selectedDialogue();
    if (!tree) return;
    const choice: WorldDialogueChoice = {
      key: `ch-${Date.now().toString(36)}`, text: '', decisionOptionId: null,
      requiredToolCode: null, effect: {}, displayOrder: tree.choices.length
    };
    this.commit({ ...tree, choices: [...tree.choices, choice] });
  }

  updateChoiceText(index: number, text: string): void {
    const tree = this.store.selectedDialogue();
    if (!tree) return;
    const choices = tree.choices.map((c, i) => i === index ? { ...c, text } : c);
    this.commit({ ...tree, choices });
  }

  setChoiceDecision(index: number, decisionOptionId: number | null): void {
    const tree = this.store.selectedDialogue();
    if (!tree) return;
    const choices = tree.choices.map((c, i) => i === index ? { ...c, decisionOptionId } : c);
    this.commit({ ...tree, choices });
  }

  setChoiceRequiredTool(index: number, requiredToolCode: string | null): void {
    const tree = this.store.selectedDialogue();
    if (!tree) return;
    const code = requiredToolCode && requiredToolCode.trim() ? requiredToolCode.trim() : null;
    const choices = tree.choices.map((c, i) => i === index ? { ...c, requiredToolCode: code } : c);
    this.commit({ ...tree, choices });
  }

  choiceEvidenceList(choice: WorldDialogueChoice, field: 'requiresNpcs' | 'requiresTools' | 'requiresInspected'): string {
    const value = (choice.effect as Record<string, unknown> | undefined)?.[field];
    return Array.isArray(value) ? value.filter(v => typeof v === 'string').join(', ') : '';
  }

  setChoiceEvidenceList(index: number, field: 'requiresNpcs' | 'requiresTools' | 'requiresInspected', raw: string): void {
    const tree = this.store.selectedDialogue();
    if (!tree) return;
    const list = raw.split(',').map(v => v.trim()).filter(Boolean);
    const choices = tree.choices.map((c, i) => {
      if (i !== index) return c;
      const effect = { ...(c.effect ?? {}) } as Record<string, unknown>;
      if (list.length) effect[field] = list;
      else delete effect[field];
      return { ...c, effect };
    });
    this.commit({ ...tree, choices });
  }

  removeChoice(index: number): void {
    const tree = this.store.selectedDialogue();
    if (!tree) return;
    const choices = tree.choices.filter((_, i) => i !== index).map((c, i) => ({ ...c, displayOrder: i }));
    this.commit({ ...tree, choices });
  }

  // ─── Movement authoring ───────────────────────────────────────────────
  movementType(obj: WorldObject): string {
    const t = (obj.movementPattern as { type?: string } | undefined)?.type;
    return t === 'wander' || t === 'patrol' ? t : 'idle';
  }
  wanderRadiusOf(obj: WorldObject): number { return wanderRadius(obj.movementPattern); }
  patrolPointsOf(obj: WorldObject): Array<[number, number]> { return patrolPoints(obj.movementPattern); }

  private setPattern(key: string, pattern: Record<string, unknown>): void {
    this.store.execute(new UpdateInspectorCommand(key, { movementPattern: pattern }));
  }
  setMovement(key: string, type: 'idle' | 'wander' | 'patrol'): void {
    const obj = this.store.selectedObject();
    if (!obj) return;
    this.setPattern(key, setPatternType(obj.movementPattern, type));
    if (type !== 'patrol') this.store.pathEditMode.set(false);
  }
  setRadius(key: string, radius: number): void {
    const obj = this.store.selectedObject();
    if (!obj) return;
    this.setPattern(key, setWanderRadius(obj.movementPattern, Number(radius)));
  }
  deleteWaypoint(key: string, idx: number): void {
    const obj = this.store.selectedObject();
    if (!obj) return;
    this.setPattern(key, removePatrolPoint(obj.movementPattern, idx));
  }
  moveWaypointOrder(key: string, idx: number, dir: 1 | -1): void {
    const obj = this.store.selectedObject();
    if (!obj) return;
    this.setPattern(key, reorderPatrolPoint(obj.movementPattern, idx, dir));
  }

  // ─── Doors (EXIT objects) ─────────────────────────────────────────────
  otherRooms() {
    const cur = this.store.definition()?.nodeId;
    return this.store.rooms().filter(r => r.nodeId !== cur);
  }
  doorTargetOf(obj: WorldObject): string { return doorTarget(obj.metadata); }
  doorEntryOf(obj: WorldObject): [number, number] { return doorEntry(obj.metadata); }
  setDoorTargetFor(key: string, nodeKey: string): void {
    const obj = this.store.selectedObject();
    if (!obj) return;
    this.store.execute(new UpdateInspectorCommand(key, { metadata: setDoorTarget(obj.metadata, nodeKey) }));
  }
  setDoorEntryFor(key: string, x: number, y: number): void {
    const obj = this.store.selectedObject();
    if (!obj) return;
    this.store.execute(new UpdateInspectorCommand(key, { metadata: setDoorEntry(obj.metadata, x, y) }));
  }

  // ─── Room settings (switcher + zoom + background) ─────────────────────
  roomZoom(): number { return cameraZoom(this.store.editorState()?.map.ambient); }
  roomBg(): string { return backgroundImage(this.store.editorState()?.map.ambient); }
  switchRoom(nodeId: number): void {
    if (nodeId != null) this.store.load(this.caseVersionId(), nodeId);
  }
  setRoomZoom(z: number): void {
    const st = this.store.editorState();
    if (!st) return;
    this.store.execute(new SetMapAmbientCommand(setCameraZoom(st.map.ambient, Number(z))));
  }
  setRoomBg(url: string): void {
    const st = this.store.editorState();
    if (!st) return;
    this.store.execute(new SetMapAmbientCommand(setBackgroundImage(st.map.ambient, url)));
  }

  // ─── Konva initialization ─────────────────────────────────────────────

  private initKonva(): void {
    if (!this.konvaHost) return;

    const container = this.konvaHost.nativeElement;
    const width = container.clientWidth || 960;
    const height = 540;

    this.stage = new Konva.Stage({
      container,
      width,
      height
    });

    this.gridLayer = new Konva.Layer();
    this.mainLayer = new Konva.Layer();
    this.uiLayer = new Konva.Layer();

    this.stage.add(this.gridLayer);
    this.stage.add(this.mainLayer);
    this.stage.add(this.uiLayer);

    // Mouse events for tools
    this.stage.on('mousedown touchstart', (e) => this.onStageMouseDown(e));
    this.stage.on('mousemove touchmove', (e) => this.onStageMouseMove(e));
    this.stage.on('mouseup touchend', () => this.onStageMouseUp());
    this.stage.on('click tap', (e) => this.onStageClick(e));

    // Wheel zoom
    this.stage.on('wheel', (e) => {
      e.evt.preventDefault();
      const delta = e.evt.deltaY > 0 ? -0.1 : 0.1;
      this.store.setZoom(this.store.zoom() + delta);
      this.applyZoom();
    });
  }

  // ─── Rendering ────────────────────────────────────────────────────────

  private renderWorld(state: { map: { width: number; height: number; spawnX: number; spawnY: number; theme: string }; objects: WorldObject[]; collisionZones: WorldCollisionZone[]; dialogues: WorldDialogueTree[] }): void {
    if (!this.mainLayer || !this.gridLayer || !this.uiLayer) return;

    this.mainLayer.destroyChildren();
    this.gridLayer.destroyChildren();
    this.uiLayer.destroyChildren();

    const { map, objects, collisionZones } = state;

    // ─── Grid + optional background image ───────────────────────────
    this.drawGrid(map.width, map.height);
    this.drawBackground(map.width, map.height);

    // ─── Map bounds ─────────────────────────────────────────────────
    this.mainLayer.add(new Konva.Rect({
      x: 0, y: 0,
      width: map.width, height: map.height,
      stroke: '#4f7cac',
      strokeWidth: 2,
      fill: 'transparent',
      dash: [6, 4],
      listening: false
    }));

    // ─── Collision zones ────────────────────────────────────────────
    for (const zone of collisionZones) {
      const group = new Konva.Group({
        x: zone.x, y: zone.y,
        name: zone.key,
        draggable: this.store.activeTool() === 'select'
      });

      group.add(new Konva.Rect({
        width: zone.width,
        height: zone.height,
        fill: 'rgba(79,124,172,0.08)',
        stroke: 'rgba(79,124,172,0.4)',
        strokeWidth: 1,
        dash: [4, 3],
        cornerRadius: 3
      }));

      if (zone.label) {
        group.add(new Konva.Text({
          x: 4, y: 4,
          text: zone.label,
          fontSize: 10,
          fontFamily: 'Arial, sans-serif',
          fill: '#4f7cac',
          listening: false
        }));
      }

      group.on('click tap', (e) => {
        e.cancelBubble = true;
        this.store.select(zone.key);
      });

      this.mainLayer.add(group);
    }

    // ─── Objects ────────────────────────────────────────────────────
    for (const obj of objects) {
      const color = OBJECT_COLORS[obj.type] ?? '#4fa3a5';
      const group = new Konva.Group({
        x: obj.x, y: obj.y,
        name: obj.key,
        draggable: this.store.activeTool() === 'select',
        opacity: obj.visible ? 1 : 0.4
      });

      // Object body
      group.add(new Konva.Circle({
        radius: 18,
        fill: color,
        stroke: '#fff',
        strokeWidth: 2,
        shadowColor: color,
        shadowBlur: 8,
        shadowOpacity: 0.25
      }));

      // Short code label
      group.add(new Konva.Text({
        text: obj.shortCode || obj.key.slice(0, 3).toUpperCase(),
        fontSize: 9,
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        fill: '#fff',
        align: 'center',
        width: 30,
        x: -15,
        y: -5,
        listening: false
      }));

      // Label below
      group.add(new Konva.Text({
        text: obj.label,
        fontSize: 10,
        fontFamily: 'Arial, sans-serif',
        fill: '#24323a',
        align: 'center',
        width: 100,
        x: -50,
        y: 22,
        listening: false
      }));

      // Badge for objects that have an authored dialogue
      if (state.dialogues?.some(d => d.mapObjectKey === obj.key)) {
        group.add(new Konva.Text({
          text: '💬', fontSize: 14, x: 8, y: -24, listening: false
        }));
      }

      // Door target label for EXIT objects
      if (obj.type === 'EXIT') {
        const target = doorTarget(obj.metadata);
        group.add(new Konva.Text({
          text: target ? '🚪 → ' + target : '🚪 (sin destino)',
          fontSize: 9, fontFamily: 'Arial, sans-serif', fill: '#a85064',
          align: 'center', width: 130, x: -65, y: 34, listening: false,
        }));
      }

      // Drag events for undo-able move
      group.on('dragstart', () => {
        this.dragStart = { x: obj.x, y: obj.y };
      });
      group.on('dragend', () => {
        if (!this.dragStart) return;
        const newX = this.snapToGrid(group.x());
        const newY = this.snapToGrid(group.y());
        group.position({ x: newX, y: newY });
        this.store.execute(new MoveObjectCommand(
          obj.key, this.dragStart.x, this.dragStart.y, newX, newY
        ));
        this.dragStart = null;
      });

      group.on('click tap', (e) => {
        e.cancelBubble = true;
        this.store.select(obj.key);
      });

      this.mainLayer.add(group);
    }

    // ─── Spawn marker ───────────────────────────────────────────────
    this.spawnMarker = new Konva.Group({
      x: map.spawnX,
      y: map.spawnY,
      listening: false
    });
    this.spawnMarker.add(new Konva.Circle({
      radius: 10,
      fill: '#2f7c5f',
      stroke: '#fff',
      strokeWidth: 2,
      opacity: 0.8
    }));
    this.spawnMarker.add(new Konva.Text({
      text: 'SP',
      fontSize: 8,
      fontStyle: 'bold',
      fill: '#fff',
      align: 'center',
      width: 16,
      x: -8,
      y: -4,
      listening: false
    }));
    this.uiLayer.add(this.spawnMarker);

    this.drawPatternOverlay();

    this.mainLayer.draw();
    this.uiLayer.draw();
    this.highlightSelected(this.store.selectedKey());
  }

  private readonly bgCache = new Map<string, HTMLImageElement>();
  private drawBackground(width: number, height: number): void {
    if (!this.gridLayer) return;
    const url = backgroundImage(this.store.editorState()?.map.ambient);
    if (!url) return;
    const add = (img: HTMLImageElement) => {
      if (!this.gridLayer) return;
      this.gridLayer.add(new Konva.Image({ image: img, x: 0, y: 0, width, height, listening: false, opacity: 0.95 }));
      this.gridLayer.draw();
    };
    const cached = this.bgCache.get(url);
    if (cached && cached.complete) { add(cached); return; }
    const img = new Image();
    img.onload = () => { this.bgCache.set(url, img); add(img); };
    img.src = url;
  }

  private drawGrid(mapWidth: number, mapHeight: number): void {
    if (!this.gridLayer) return;

    // Background
    this.gridLayer.add(new Konva.Rect({
      x: 0, y: 0,
      width: mapWidth, height: mapHeight,
      fill: '#f8fbfd',
      listening: false
    }));

    // Grid lines
    for (let x = 0; x <= mapWidth; x += GRID_SIZE) {
      this.gridLayer.add(new Konva.Line({
        points: [x, 0, x, mapHeight],
        stroke: 'rgba(79,124,172,0.06)',
        strokeWidth: x % (GRID_SIZE * 4) === 0 ? 1 : 0.5,
        listening: false
      }));
    }
    for (let y = 0; y <= mapHeight; y += GRID_SIZE) {
      this.gridLayer.add(new Konva.Line({
        points: [0, y, mapWidth, y],
        stroke: 'rgba(79,124,172,0.06)',
        strokeWidth: y % (GRID_SIZE * 4) === 0 ? 1 : 0.5,
        listening: false
      }));
    }
    this.gridLayer.draw();
  }

  // ─── Mouse handlers ───────────────────────────────────────────────────

  private onStageMouseDown(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    const tool = this.store.activeTool();
    const pos = this.getPointerPos();
    if (!pos) return;

    if (tool === 'place-collision') {
      this.drawingZone = true;
      this.drawStart = { x: this.snapToGrid(pos.x), y: this.snapToGrid(pos.y) };
      this.drawRect = new Konva.Rect({
        x: this.drawStart.x,
        y: this.drawStart.y,
        width: 0, height: 0,
        fill: 'rgba(79,124,172,0.12)',
        stroke: 'rgba(79,124,172,0.5)',
        strokeWidth: 1,
        dash: [4, 3]
      });
      this.uiLayer?.add(this.drawRect);
    }
  }

  private onStageMouseMove(_e: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    if (!this.drawingZone || !this.drawRect) return;
    const pos = this.getPointerPos();
    if (!pos) return;

    const x = Math.min(this.drawStart.x, pos.x);
    const y = Math.min(this.drawStart.y, pos.y);
    const w = Math.abs(pos.x - this.drawStart.x);
    const h = Math.abs(pos.y - this.drawStart.y);

    this.drawRect.setAttrs({ x, y, width: w, height: h });
    this.uiLayer?.batchDraw();
  }

  private onStageMouseUp(): void {
    if (this.drawingZone && this.drawRect) {
      const x = this.snapToGrid(this.drawRect.x());
      const y = this.snapToGrid(this.drawRect.y());
      const w = this.snapToGrid(this.drawRect.width());
      const h = this.snapToGrid(this.drawRect.height());

      if (w >= GRID_SIZE && h >= GRID_SIZE) {
        const key = this.store.generateKey('zone');
        const zone: WorldCollisionZone = {
          id: this.store.nextLocalId(),
          key,
          label: null,
          x, y,
          width: w,
          height: h
        };
        this.store.execute(new PlaceCollisionZoneCommand(zone));
      }

      this.drawRect.destroy();
      this.drawRect = null;
      this.drawingZone = false;
      this.uiLayer?.batchDraw();
    }
  }

  private onStageClick(e: Konva.KonvaEventObject<MouseEvent>): void {
    const tool = this.store.activeTool();
    const pos = this.getPointerPos();
    if (!pos) return;

    // Path-edit mode: clicking the canvas appends a waypoint to the selected patrol NPC.
    if (this.store.pathEditMode()) {
      const sel = this.store.selectedObject();
      if (sel && this.movementType(sel) === 'patrol') {
        const wx = this.snapToGrid(pos.x);
        const wy = this.snapToGrid(pos.y);
        this.setPattern(sel.key, withPatrolPoint(sel.movementPattern, wx, wy));
        return;
      }
    }

    // Click on empty space → deselect
    if (e.target === this.stage) {
      this.store.select(null);
    }

    if (tool === 'place-object') {
      const x = this.snapToGrid(pos.x);
      const y = this.snapToGrid(pos.y);
      const key = this.store.generateKey('obj');
      const obj: WorldObject = {
        id: this.store.nextLocalId(),
        key,
        label: 'Nuevo objeto',
        type: 'OBJECT' as WorldObjectType,
        x, y,
        width: 48, height: 48,
        zIndex: 0,
        facing: 'down',
        colorHex: '#4FA3A5',
        icon: 'psychology',
        shortCode: 'NEW',
        collision: false,
        visible: true,
        interactionPrompt: 'Interactuar',
        interactionText: '',
        decisionOptionId: null,
        toolCode: null,
        unlockCondition: {},
        movementPattern: {},
        metadata: {}
      };
      this.store.execute(new PlaceObjectCommand(obj));
      this.store.select(key);
      this.store.setTool('select');
    }

    if (tool === 'place-spawn') {
      const x = this.snapToGrid(pos.x);
      const y = this.snapToGrid(pos.y);
      this.store.execute(new UpdateSpawnCommand(x, y));
      this.store.setTool('select');
    }
  }

  // ─── Utilities ────────────────────────────────────────────────────────

  private getPointerPos(): { x: number; y: number } | null {
    if (!this.stage) return null;
    const pointer = this.stage.getPointerPosition();
    if (!pointer) return null;
    // Account for zoom/pan
    const transform = this.mainLayer?.getAbsoluteTransform().copy().invert();
    if (transform) {
      return transform.point(pointer);
    }
    return pointer;
  }

  private snapToGrid(value: number): number {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  }

  private applyZoom(): void {
    if (!this.stage || !this.mainLayer || !this.gridLayer || !this.uiLayer) return;
    const zoom = this.store.zoom();
    this.mainLayer.scale({ x: zoom, y: zoom });
    this.gridLayer.scale({ x: zoom, y: zoom });
    this.uiLayer.scale({ x: zoom, y: zoom });
    this.stage.batchDraw();
  }

  private highlightSelected(key: string | null): void {
    if (!this.mainLayer) return;

    // Remove previous highlights
    this.mainLayer.find('.selection-ring').forEach(n => n.destroy());

    if (!key) { this.mainLayer.batchDraw(); return; }

    const node = this.mainLayer.findOne(`[name=${key}]`);
    if (!node) { this.mainLayer.batchDraw(); return; }

    // Object selection ring
    if (this.store.selectedObject()) {
      const ring = new Konva.Circle({
        radius: 24,
        stroke: '#4f7cac',
        strokeWidth: 2,
        dash: [4, 3],
        fill: 'transparent',
        name: 'selection-ring',
        listening: false
      });
      (node as Konva.Group).add(ring);
    }
    // Zone selection ring
    else if (this.store.selectedZone()) {
      const zone = this.store.selectedZone()!;
      const ring = new Konva.Rect({
        x: -2, y: -2,
        width: zone.width + 4,
        height: zone.height + 4,
        stroke: '#4f7cac',
        strokeWidth: 2,
        dash: [4, 3],
        fill: 'transparent',
        name: 'selection-ring',
        listening: false
      });
      (node as Konva.Group).add(ring);
    }

    this.mainLayer.batchDraw();
  }

  // ─── Movement pattern overlay (selected object) ───────────────────────
  private drawPatternOverlay(): void {
    if (!this.uiLayer) return;
    const sel = this.store.selectedObject();
    if (!sel) return;
    const type = (sel.movementPattern as { type?: string } | undefined)?.type;
    if (type === 'wander') {
      this.uiLayer.add(new Konva.Circle({
        x: sel.x, y: sel.y, radius: wanderRadius(sel.movementPattern),
        stroke: '#7a6f9e', dash: [6, 4], strokeWidth: 1, listening: false,
      }));
    } else if (type === 'patrol') {
      const pts = patrolPoints(sel.movementPattern);
      const flat: number[] = [sel.x, sel.y];
      for (const [px, py] of pts) flat.push(px, py);
      this.uiLayer.add(new Konva.Line({
        points: flat, stroke: '#7a6f9e', strokeWidth: 2, dash: [4, 4], listening: false,
      }));
      pts.forEach(([px, py], i) => {
        const handle = new Konva.Group({ x: px, y: py, draggable: true });
        handle.add(new Konva.Circle({ radius: 9, fill: '#7a6f9e', stroke: '#fff', strokeWidth: 2 }));
        handle.add(new Konva.Text({
          text: String(i + 1), fontSize: 9, fontStyle: 'bold', fill: '#fff',
          x: -9, y: -4, width: 18, align: 'center', listening: false,
        }));
        handle.on('dragend', () => {
          const nx = this.snapToGrid(handle.x());
          const ny = this.snapToGrid(handle.y());
          this.setPattern(sel.key, movePatrolPoint(sel.movementPattern, i, nx, ny));
        });
        this.uiLayer!.add(handle);
      });
    }
  }
}
