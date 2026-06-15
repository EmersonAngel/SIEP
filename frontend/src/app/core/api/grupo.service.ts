import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { SimulationCaseSummary } from '../models/simulation.model';

export interface Grupo {
  id: number;
  nombre: string;
  codigo: string;
  totalEstudiantes: number;
}

export interface GrupoEstudiante {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  role: 'ESTUDIANTE';
  activo: boolean;
}

interface ApiResponse<T> { data: T; message?: string | null; success?: boolean; }

@Injectable({ providedIn: 'root' })
export class GrupoService {
  private http = inject(HttpClient);
  private readonly API = '/api/grupos';

  listar() {
    return this.http.get<ApiResponse<Grupo[]>>(this.API).pipe(map(r => r.data));
  }

  crear(nombre: string, codigo: string) {
    return this.http.post<ApiResponse<Grupo>>(this.API, { nombre, codigo }).pipe(map(r => r.data));
  }

  agregarEstudiante(grupoId: number, email: string) {
    return this.http.post<ApiResponse<Grupo>>(`${this.API}/${grupoId}/estudiantes`, { email })
      .pipe(map(r => r.data));
  }

  listarEstudiantes(grupoId: number) {
    return this.http.get<ApiResponse<GrupoEstudiante[]>>(`${this.API}/${grupoId}/estudiantes`)
      .pipe(map(r => r.data));
  }

  listarCasos(grupoId: number) {
    return this.http.get<ApiResponse<SimulationCaseSummary[]>>(`${this.API}/${grupoId}/casos`)
      .pipe(map(r => r.data));
  }

  asignarCaso(grupoId: number, caseVersionId: number) {
    return this.http.post<ApiResponse<SimulationCaseSummary[]>>(`${this.API}/${grupoId}/casos`, { caseVersionId })
      .pipe(map(r => r.data));
  }

  quitarCaso(grupoId: number, caseVersionId: number) {
    return this.http.delete<ApiResponse<SimulationCaseSummary[]>>(`${this.API}/${grupoId}/casos/${caseVersionId}`)
      .pipe(map(r => r.data));
  }
}
