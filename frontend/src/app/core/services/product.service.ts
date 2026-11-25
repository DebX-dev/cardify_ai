import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import {
  AnalyticsSummary,
  GenerateRunPayload,
  PaginatedRuns,
  Run,
  SeoAnalysis,
} from '../models/run.model';
import { ENV_CONFIG } from '../tokens/env.token';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENV_CONFIG);

  generateRun(payload: GenerateRunPayload): Observable<Run> {
    return this.http
      .post<Run>(`${this.env.apiBaseUrl}/runs`, payload)
      .pipe(timeout(this.env.requestTimeoutMs));
  }

  getRuns(params?: { page?: number; limit?: number; q?: string; tone?: string }): Observable<PaginatedRuns> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit);
    if (params?.q) httpParams = httpParams.set('q', params.q);
    if (params?.tone) httpParams = httpParams.set('tone', params.tone);

    return this.http
      .get<PaginatedRuns>(`${this.env.apiBaseUrl}/runs`, { params: httpParams })
      .pipe(timeout(this.env.requestTimeoutMs));
  }

  getRunById(id: string): Observable<Run> {
    return this.http
      .get<Run>(`${this.env.apiBaseUrl}/runs/${id}`)
      .pipe(timeout(this.env.requestTimeoutMs));
  }

  pickWinner(runId: string, variantId: string): Observable<Run> {
    return this.http
      .patch<Run>(`${this.env.apiBaseUrl}/runs/${runId}/pick`, { variantId })
      .pipe(timeout(this.env.requestTimeoutMs));
  }

  regenerateVariant(runId: string, variantId: string, feedback: string): Observable<Run> {
    return this.http
      .post<Run>(`${this.env.apiBaseUrl}/runs/${runId}/regenerate/${variantId}`, { feedback })
      .pipe(timeout(this.env.requestTimeoutMs));
  }

  transformTone(runId: string, variantId: string, tone: string): Observable<Run> {
    return this.http
      .post<Run>(`${this.env.apiBaseUrl}/runs/${runId}/transform`, { variantId, tone })
      .pipe(timeout(this.env.requestTimeoutMs));
  }

  analyzeSeo(runId: string, variantId: string): Observable<SeoAnalysis> {
    return this.http
      .post<SeoAnalysis>(`${this.env.apiBaseUrl}/runs/${runId}/seo`, { variantId })
      .pipe(timeout(this.env.requestTimeoutMs));
  }

  getAnalyticsSummary(): Observable<AnalyticsSummary> {
    return this.http
      .get<AnalyticsSummary>(`${this.env.apiBaseUrl}/analytics/summary`)
      .pipe(timeout(this.env.requestTimeoutMs));
  }
}
