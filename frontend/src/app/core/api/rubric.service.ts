import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';

export interface RubricCriterionAdmin {
  id?: number;
  competency?: string;
  title: string;
  description?: string | null;
  weight: number;
  maxScore?: number;
  displayOrder: number;
  active: boolean;
}

export interface RubricAdmin {
  id: number;
  name: string;
  description: string | null;
  active: boolean;
  version: string;
  isDefault: boolean;
  totalWeight: number;
  criteriaCount: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  criteria?: RubricCriterionAdmin[];
}

interface ApiResponse<T> {
  data: T;
  message?: string | null;
}

@Injectable({ providedIn: 'root' })
export class RubricService {
  private readonly http = inject(HttpClient);
  private readonly API = '/api/rubrics';

  list() {
    return this.http.get<ApiResponse<RubricAdmin[]>>(`${this.API}/`).pipe(map(r => r.data));
  }

  detail(id: number) {
    return this.http.get<ApiResponse<RubricAdmin>>(`${this.API}/${id}`).pipe(map(r => r.data));
  }

  create(payload: Partial<RubricAdmin>) {
    return this.http.post<ApiResponse<RubricAdmin>>(`${this.API}/`, payload).pipe(map(r => r.data));
  }

  update(id: number, payload: Partial<RubricAdmin>) {
    return this.http.put<ApiResponse<RubricAdmin>>(`${this.API}/${id}`, payload).pipe(map(r => r.data));
  }

  activate(id: number) {
    return this.http.post<ApiResponse<RubricAdmin>>(`${this.API}/${id}/activate`, {}).pipe(map(r => r.data));
  }

  deactivate(id: number) {
    return this.http.post<ApiResponse<RubricAdmin>>(`${this.API}/${id}/deactivate`, {}).pipe(map(r => r.data));
  }

  duplicate(id: number) {
    return this.http.post<ApiResponse<RubricAdmin>>(`${this.API}/${id}/duplicate`, {}).pipe(map(r => r.data));
  }

  setDefault(id: number) {
    return this.http.post<ApiResponse<RubricAdmin>>(`${this.API}/${id}/default`, {}).pipe(map(r => r.data));
  }

  assignToCaseVersion(caseVersionId: number, rubricId: number) {
    return this.http.put<ApiResponse<{ caseVersionId: number; rubric: RubricAdmin }>>(
      `${this.API}/case-versions/${caseVersionId}`,
      { rubricId }
    ).pipe(map(r => r.data));
  }
}
