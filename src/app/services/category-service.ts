import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';

export interface CategoryPayload {
  categoryid: string;
  categorytitle: string;
  categoryicon: string;
  categorygroup: string;
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly endpoint = 'https://salareanit.com/api/POSCategory/';

  constructor(private http: HttpClient) {}

  GetAllCategory(group = 'sv5-theng_rithy') {
    return this.http
      .get(`${this.endpoint}?group=${encodeURIComponent(group)}`, { responseType: 'text' })
      .pipe(map((raw) => this.parseCategoryResponse(raw)));
  }

  PostCategory(body: CategoryPayload) {
    return this.http.post(this.endpoint, body);
  }

  PutCategory(id: string, body: CategoryPayload) {
    return this.http.put(`${this.endpoint}${encodeURIComponent(id)}/`, body);
  }

  DeleteCategory(id: string) {
    return this.http.delete(`${this.endpoint}${encodeURIComponent(id)}/`);
  }

  private parseCategoryResponse(raw: string): { data: CategoryPayload[] } {
    const normalized = raw.replace(/"categoryid"\s*:\s*(\d+)/g, '"categoryid":"$1"');
    const parsed = JSON.parse(normalized) as { data?: any[] };
    const data = Array.isArray(parsed?.data)
      ? parsed.data.map((c) => ({
          categoryid: String(c.categoryid ?? ''),
          categorytitle: String(c.categorytitle ?? ''),
          categoryicon: String(c.categoryicon ?? ''),
          categorygroup: String(c.categorygroup ?? ''),
        }))
      : [];
    return { data };
  }
}
